const express = require("express");
const pool = require("../db");

const router = express.Router();

// LISTAR (com filtros + paginação)
router.get("/", async (req, res) => {
  try {
    let { destino, ordem, offset, limit, data_ini, data_fim } = req.query;

    destino = destino ? "%" + destino + "%" : "%";
    ordem = ordem && ordem.toLowerCase() === "asc" ? "ASC" : "DESC";
    offset = Math.max(parseInt(offset) || 0, 0);
    limit = Math.min(parseInt(limit) || 100, 200);

    const hasDateFilter = data_ini || data_fim;

    const query = `
      SELECT * FROM public.recomendacoes
      WHERE destino ILIKE $1
      ${hasDateFilter ? "AND data_ida BETWEEN $2 AND $3" : ""}
      ORDER BY id ${ordem}
      LIMIT $${hasDateFilter ? 4 : 2}
      OFFSET $${hasDateFilter ? 5 : 3}
    `;

    let params;
    if (hasDateFilter) {
      const ini = data_ini || "1900-01-01";
      const fim = data_fim || "2999-12-31";
      params = [destino, ini, fim, limit, offset];
    } else {
      params = [destino, limit, offset];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("ERRO /recomendacoes:", err);
    res.status(500).json({ error: "Erro ao listar recomendacoes", detalhes: err.message });
  }
});

// BUSCAR POR ID
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "ID inválido" });

    const result = await pool.query(
      "SELECT * FROM public.recomendacoes WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Recomendação não encontrada" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar recomendação", detalhes: err.message });
  }
});

// INSERIR
router.post("/", async (req, res) => {
  try {
    const { destino, preco_passagem, data_ida, data_volta, imagem_ref } = req.body;

    if (!destino || preco_passagem === undefined || !data_ida || !data_volta || !imagem_ref) {
      return res.status(400).json({
        error: "Campos obrigatórios: destino, preco_passagem, data_ida, data_volta, imagem_ref"
      });
    }

    const preco = Number(preco_passagem);
    if (Number.isNaN(preco) || preco < 0) {
      return res.status(400).json({ error: "preco_passagem inválido" });
    }

    if (new Date(data_volta) < new Date(data_ida)) {
      return res.status(400).json({ error: "data_volta não pode ser menor que data_ida" });
    }

    const result = await pool.query(
      `INSERT INTO public.recomendacoes (destino, preco_passagem, data_ida, data_volta, imagem_ref)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [destino, preco, data_ida, data_volta, imagem_ref]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erro ao inserir recomendação", detalhes: err.message });
  }
});

// ATUALIZAR
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "ID inválido" });

    const { destino, preco_passagem, data_ida, data_volta, imagem_ref } = req.body;

    if (!destino || preco_passagem === undefined || !data_ida || !data_volta || !imagem_ref) {
      return res.status(400).json({
        error: "Campos obrigatórios: destino, preco_passagem, data_ida, data_volta, imagem_ref"
      });
    }

    const preco = Number(preco_passagem);
    if (Number.isNaN(preco) || preco < 0) {
      return res.status(400).json({ error: "preco_passagem inválido" });
    }

    if (new Date(data_volta) < new Date(data_ida)) {
      return res.status(400).json({ error: "data_volta não pode ser menor que data_ida" });
    }

    const result = await pool.query(
      `UPDATE public.recomendacoes
       SET destino=$1, preco_passagem=$2, data_ida=$3, data_volta=$4, imagem_ref=$5
       WHERE id=$6
       RETURNING *`,
      [destino, preco, data_ida, data_volta, imagem_ref, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Recomendação não encontrada" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar recomendação", detalhes: err.message });
  }
});

// DELETAR
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "ID inválido" });

    const result = await pool.query(
      "DELETE FROM public.recomendacoes WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Recomendação não encontrada" });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar recomendação", detalhes: err.message });
  }
});

module.exports = router;
