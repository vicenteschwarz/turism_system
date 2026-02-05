const express = require("express");
const pool = require("../db");
const { exigirUser, somenteAdm } = require("../authorization");

const router = express.Router();

// LISTAR (adm vê tudo / user vê só as próprias)
router.get("/", exigirUser, async (req, res) => {
  try {
    let { destino, comprador, ordem, offset, limit, data_ini, data_fim } = req.query;

    destino = destino ? "%" + destino + "%" : "%";
    comprador = comprador ? "%" + comprador + "%" : "%";
    ordem = ordem && ordem.toLowerCase() === "asc" ? "ASC" : "DESC";
    offset = parseInt(offset) || 0;
    limit = parseInt(limit) || 100;

    const hasDateFilter = data_ini || data_fim;
    const isAdm = req.user.role === "adm";

    // Monta query com filtro de dono quando for user
    const query = `
      SELECT * FROM public.viagens
      WHERE destino ILIKE $1
        AND comprador ILIKE $2
        ${isAdm ? "" : "AND user_id = $3"}
        ${hasDateFilter ? (isAdm ? "AND data_ida BETWEEN $3 AND $4" : "AND data_ida BETWEEN $4 AND $5") : ""}
      ORDER BY id ${ordem}
      LIMIT $${hasDateFilter ? (isAdm ? 5 : 6) : (isAdm ? 3 : 4)}
      OFFSET $${hasDateFilter ? (isAdm ? 6 : 7) : (isAdm ? 4 : 5)}
    `;

    let params;

    if (hasDateFilter) {
      const ini = data_ini || "1900-01-01";
      const fim = data_fim || "2999-12-31";

      params = isAdm
        ? [destino, comprador, ini, fim, limit, offset]
        : [destino, comprador, req.user.id, ini, fim, limit, offset];
    } else {
      params = isAdm
        ? [destino, comprador, limit, offset]
        : [destino, comprador, req.user.id, limit, offset];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("ERRO /viagens:", err);
    res.status(500).json({ error: "Erro ao listar viagens", detalhes: err.message });
  }
});

// BUSCAR POR ID (adm vê qualquer / user só a dele)
router.get("/:id", exigirUser, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const isAdm = req.user.role === "adm";

    const result = await pool.query(
      isAdm
        ? "SELECT * FROM public.viagens WHERE id = $1"
        : "SELECT * FROM public.viagens WHERE id = $1 AND user_id = $2",
      isAdm ? [id] : [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Viagem não encontrada" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar viagem", detalhes: err.message });
  }
});

// INSERIR (somente adm) - inserir direto
router.post("/", somenteAdm, async (req, res) => {
  try {
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
      `INSERT INTO public.viagens (destino, caracteristica, comprador, data_ida, data_volta, user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [destino, caracteristica, comprador, data_ida, data_volta, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erro ao inserir viagem", detalhes: err.message });
  }
});

// COMPRAR A PARTIR DE RECOMENDAÇÃO (somente user)
router.post("/from-recomendacao/:id", exigirUser, async (req, res) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({ error: "Apenas usuário comum compra via recomendação" });
    }

    const recoId = parseInt(req.params.id);
    const { comprador } = req.body;

    const compradorFinal = (comprador || req.user.nome || "").trim();
    if (!compradorFinal) return res.status(400).json({ error: "Informe o comprador" });

    const reco = await pool.query(
      "SELECT destino, data_ida, data_volta FROM public.recomendacoes WHERE id = $1",
      [recoId]
    );

    if (reco.rows.length === 0) {
      return res.status(404).json({ error: "Recomendação não encontrada" });
    }

    const r = reco.rows[0];

    const insert = await pool.query(
      `INSERT INTO public.viagens (destino, caracteristica, comprador, data_ida, data_volta, user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [r.destino, "recomendação", compradorFinal, r.data_ida, r.data_volta, req.user.id]
    );

    res.status(201).json(insert.rows[0]);
  } catch (err) {
    console.error("ERRO /viagens/from-recomendacao:", err);
    res.status(500).json({ error: "Erro ao comprar recomendação", detalhes: err.message });
  }
});

// ATUALIZAR (somente adm)
router.put("/:id", somenteAdm, async (req, res) => {
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

// DELETAR (somente adm)
router.delete("/:id", somenteAdm, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const result = await pool.query(
      "DELETE FROM public.viagens WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Viagem não encontrada" });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar viagem", detalhes: err.message });
  }
});

module.exports = router;
