const express = require("express");
const router = express.Router();
const pool = require("../db");

// 🔹 Ver carrinho
router.get("/", async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ erro: "Não autenticado" });
        }

        const { id } = req.user;

        const result = await pool.query(
            `SELECT c.id, r.id as recomendacao_id,
              r.destino, r.preco_passagem,
              r.data_ida, r.data_volta
       FROM carrinho c
       JOIN recomendacoes r ON r.id = c.recomendacao_id
       WHERE c.user_id = $1
       AND c.status = 'ativo'
       ORDER BY c.criado_em DESC`,
            [id]
        );

        res.json(result.rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: "Erro ao buscar carrinho" });
    }
});


// 🔹 Adicionar ao carrinho
router.post("/adicionar", async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ erro: "Não autenticado" });
        }

        const { recomendacao_id, comprador } = req.body;

        if (!recomendacao_id || !comprador || comprador.trim() === "") {
            return res.status(400).json({ erro: "Comprador é obrigatório" });
        }

        const { id } = req.user;

        if (!recomendacao_id) {
            return res.status(400).json({ erro: "recomendacao_id é obrigatório" });
        }

        await pool.query(
            `INSERT INTO carrinho (user_id, recomendacao_id, comprador)
       VALUES ($1, $2, $3)`,
            [id, recomendacao_id, comprador]
        );

        res.json({ message: "Item adicionado ao carrinho" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: "Erro ao adicionar item" });
    }
});

// 🔹 Atualizar comprador do item
router.put("/:id", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ erro: "Não autenticado" });
    }

    const itemId = req.params.id;
    const { comprador } = req.body;
    const { id } = req.user;

    if (!comprador || comprador.trim() === "") {
      return res.status(400).json({ erro: "Comprador é obrigatório" });
    }

    await pool.query(
      `UPDATE carrinho
       SET comprador = $1
       WHERE id = $2
       AND user_id = $3
       AND status = 'ativo'`,
      [comprador.trim(), itemId, id]
    );

    res.json({ message: "Comprador atualizado" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao atualizar comprador" });
  }
});



// 🔹 Remover item do carrinho
router.delete("/:id", async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ erro: "Não autenticado" });
        }

        const itemId = req.params.id;
        const { id } = req.user;

        await pool.query(
            `DELETE FROM carrinho
       WHERE id = $1
       AND user_id = $2
       AND status = 'ativo'`,
            [itemId, id]
        );

        res.json({ message: "Item removido" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: "Erro ao remover item" });
    }
});


router.post("/finalizar", async (req, res) => {
    const client = await pool.connect();

    try {
        if (!req.user) {
            return res.status(401).json({ erro: "Não autenticado" });
        }

        const { id } = req.user;

        await client.query("BEGIN");

        // 🔎 Busca itens ativos do carrinho
        const itens = await client.query(
            `SELECT c.id as carrinho_id,
              c.comprador,
              r.destino,
              r.data_ida,
              r.data_volta
       FROM carrinho c
       JOIN recomendacoes r ON r.id = c.recomendacao_id
       WHERE c.user_id = $1
       AND c.status = 'ativo'`,
            [id]
        );

        if (itens.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({ erro: "Carrinho vazio" });
        }

        // Para cada item → inserir na tabela viagens
        for (let item of itens.rows) {

            if(!item.comprador){
                await client.query('ROLLBACK')
                return res.status(400).json({erro:"Item sem comprador no carrinho"})            
            }


            await client.query(
                `INSERT INTO viagens
         (destino, caracteristica, comprador, data_ida, data_volta, user_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    item.destino,
                    "Compra via recomendação",
                    item.comprador,
                    item.data_ida,
                    item.data_volta,
                    id
                ]
            );
        }

        // ✅ Marca carrinho como comprado
        await client.query(
            `UPDATE carrinho
       SET status = 'comprado'
       WHERE user_id = $1
       AND status = 'ativo'`,
            [id]
        );

        await client.query("COMMIT");

        res.json({ message: "Compra finalizada com sucesso!" });

    } catch (err) {
        await client.query("ROLLBACK");
        console.error(err);
        res.status(500).json({ erro: "Erro ao finalizar compra" });
    } finally {
        client.release();
    }
});


module.exports = router;

