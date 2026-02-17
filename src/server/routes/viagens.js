const express = require("express");
const pool = require("../db");
const verificarToken = require("../middleware/verificarToken");

const router = express.Router();

/* ===========================
   LISTAR VIAGENS
   =========================== */
router.get("/", verificarToken, async (req, res) => {
  try {
    const isAdm = req.user.role === "adm";

    const limit = parseInt(req.query.limit) || 3;
    const offset = parseInt(req.query.offset) || 0;

    let query;
    let params = [];

    if (isAdm) {
      query = `
        SELECT * FROM public.viagens
        ORDER BY id DESC
        LIMIT $1 OFFSET $2
      `;
      params = [limit, offset];
    } else {
      query = `
        SELECT * FROM public.viagens
        WHERE user_id = $1
        ORDER BY id DESC
        LIMIT $2 OFFSET $3
      `;
      params = [req.user.id, limit, offset];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar viagens" });
  }
});

/* ===========================
   BUSCAR POR ID
   =========================== */
router.get("/:id", verificarToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const result = await pool.query(
      "SELECT * FROM public.viagens WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Viagem não encontrada" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar viagem" });
  }
});


/* ===========================
   INSERIR (APENAS ADM)
   =========================== */
router.post("/", verificarToken, async (req, res) => {
  try {
    if (req.user.role !== "adm") {
      return res.status(403).json({ error: "Apenas admin pode criar viagem" });
    }

    const { destino, caracteristica, comprador, data_ida, data_volta } = req.body;

    const result = await pool.query(
      `INSERT INTO public.viagens 
       (destino, caracteristica, comprador, data_ida, data_volta, user_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [destino, caracteristica, comprador, data_ida, data_volta, req.user.id]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ error: "Erro ao criar viagem" });
  }
});


/* ===========================
   COMPRAR VIA RECOMENDAÇÃO (USER)
   =========================== */
router.post("/from-recomendacao/:id", verificarToken, async (req, res) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({ error: "Somente usuário comum pode comprar" });
    }

    const recoId = parseInt(req.params.id);

    const reco = await pool.query(
      "SELECT destino, data_ida, data_volta FROM public.recomendacoes WHERE id = $1",
      [recoId]
    );

    if (reco.rows.length === 0) {
      return res.status(404).json({ error: "Recomendação não encontrada" });
    }

    const r = reco.rows[0];

    const result = await pool.query(
      `INSERT INTO public.viagens
       (destino, caracteristica, comprador, data_ida, data_volta, user_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [r.destino, "recomendação", req.user.nome, r.data_ida, r.data_volta, req.user.id]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ error: "Erro ao comprar viagem" });
  }
});


/* ===========================
   ATUALIZAR (APENAS ADM)
   =========================== */
router.put("/:id", verificarToken, async (req, res) => {
  try {
    if (req.user.role !== "adm") {
      return res.status(403).json({ error: "Apenas admin pode editar" });
    }

    const id = parseInt(req.params.id);
    const { destino, caracteristica, comprador, data_ida, data_volta } = req.body;

    const result = await pool.query(
      `UPDATE public.viagens
       SET destino=$1, caracteristica=$2, comprador=$3,
           data_ida=$4, data_volta=$5
       WHERE id=$6
       RETURNING *`,
      [destino, caracteristica, comprador, data_ida, data_volta, id]
    );

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar" });
  }
});


/* ===========================
   DELETAR
   =========================== */
router.delete("/:id", verificarToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (req.user.role === "adm") {
      await pool.query("DELETE FROM public.viagens WHERE id = $1", [id]);
    } else {
      await pool.query(
        "DELETE FROM public.viagens WHERE id = $1 AND user_id = $2",
        [id, req.user.id]
      );
    }

    res.status(204).end();

  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar" });
  }
});

module.exports = router;
