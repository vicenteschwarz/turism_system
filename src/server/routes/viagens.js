const express = require("express");
const pool = require("../db");

const router = express.Router();

// LISTAR (com filtros + paginação)
router.get("/", async (req, res) => {
    try {
        let { destino, comprador, ordem, offset, limit, data_ini, data_fim } = req.query;

        destino = destino ? "%" + destino + "%" : "%";
        comprador = comprador ? "%" + comprador + "%" : "%";
        ordem = ordem && ordem.toLowerCase() === "asc" ? "ASC" : "DESC";
        offset = parseInt(offset) || 0;
        limit = parseInt(limit) || 100;

        // filtro opcional por intervalo de data_ida (se vier no query)
        // data_ini e data_fim devem ser "YYYY-MM-DD"
        const hasDateFilter = data_ini || data_fim;

        const info = await pool.query("SELECT current_database() db, current_schema() sch");
        console.log("DB/SCH da API:", info.rows[0]);


        const query = `
      SELECT * FROM public.viagens
      WHERE destino ILIKE $1
        AND comprador ILIKE $2
        ${hasDateFilter ? "AND data_ida BETWEEN $3 AND $4" : ""}
      ORDER BY id ${ordem}
      LIMIT $${hasDateFilter ? 5 : 3}
      OFFSET $${hasDateFilter ? 6 : 4}
    `;

        let params;
        if (hasDateFilter) {
            // defaults bem amplos se só um lado vier
            const ini = data_ini || "1900-01-01";
            const fim = data_fim || "2999-12-31";
            params = [destino, comprador, ini, fim, limit, offset];
        } else {
            params = [destino, comprador, limit, offset];
        }

        const result = await pool.query(query, params);
        res.json(result.rows);

    } catch (err) {
        console.error("ERRO /viagens:", err); // <-- importante
        res.status(500).json({ error: "Erro ao listar viagens", detalhes: err.message });
    };
}
);

// BUSCAR POR ID
router.get("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await pool.query(
            "SELECT * FROM public.viagens WHERE id = $1",
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "Viagem não encontrada" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Erro ao buscar viagem", detalhes: err.message });
    }
});

// INSERIR
router.post("/", async (req, res) => {
    try {
        const { destino, caracteristica, comprador, data_ida, data_volta } = req.body;

        if (!destino || !caracteristica || !comprador || !data_ida || !data_volta) {
            return res.status(400).json({
                error: "Campos obrigatórios: destino, caracteristica, comprador, data_ida, data_volta"
            });
        }

        // validação simples de datas
        if (new Date(data_volta) < new Date(data_ida)) {
            return res.status(400).json({ error: "data_volta não pode ser menor que data_ida" });
        }

        const result = await pool.query(
            `INSERT INTO public.viagens (destino, caracteristica, comprador, data_ida, data_volta)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [destino, caracteristica, comprador, data_ida, data_volta]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Erro ao inserir viagem", detalhes: err.message });
    }
});

// ATUALIZAR
router.put("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { destino, caracteristica, comprador, data_ida, data_volta } = req.body;

        if (!destino || !caracteristica || !comprador || !data_ida || !data_volta) {
            return res.status(400).json({
                error: "Campos obrigatórios: destino, caracteristica, comprador, data_ida, data_volta"
            });
        }

        if (new Date(data_volta) < new Date(data_ida)) {
            return res.status(400).json({ error: "data_volta não pode ser menor que data_ida" });
        }

        const result = await pool.query(
            `UPDATE public.viagens
       SET destino=$1, caracteristica=$2, comprador=$3, data_ida=$4, data_volta=$5
       WHERE id=$6
       RETURNING *`,
            [destino, caracteristica, comprador, data_ida, data_volta, id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "Viagem não encontrada" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Erro ao atualizar viagem", detalhes: err.message });
    }
});

// DELETAR
router.delete("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await pool.query("DELETE FROM public.viagens WHERE id = $1 RETURNING *", [id]);

        if (result.rows.length === 0) return res.status(404).json({ error: "Viagem não encontrada" });
        res.status(204).end();
    } catch (err) {
        res.status(500).json({ error: "Erro ao deletar viagem", detalhes: err.message });
    }
});

module.exports = router;
