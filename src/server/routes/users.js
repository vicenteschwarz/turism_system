const express = require("express");
const pool = require("../db");

const router = express.Router();
const verificarToken = require("../middleware/verificarToken");



router.get("/me", verificarToken, (req, res) => {
  res.json(req.user);
});


//daqui pra baixo, so funções/recs que o admin possui (so admin tem)
// Listar usuários (admin)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nome, role, ativo, criado_em
       FROM public.users
       ORDER BY id DESC`
    );

    if (req.user.role !== "adm") {
   return res.status(403).json({ error: "Apenas admin" });
}

    res.json(result.rows);
  } catch (err) {
    console.error("ERRO GET /users:", err);
    res.status(500).json({ error: "Erro ao listar users", detalhes: err.message });
  }
});

// Criar usuário (admin)
// api_token vem do DEFAULT gen_random_uuid()
router.post("/", async (req, res) => {
  try {
    const { nome, role } = req.body;

    if (!nome) {
      return res.status(400).json({ error: "Campo obrigatório: nome" });
    }

if (req.user.role !== "adm") {
   return res.status(403).json({ error: "Apenas admin" });
}


    const roleFinal = role === "adm" ? "adm" : "user";

    const result = await pool.query(
      `INSERT INTO public.users (nome, role)
       VALUES ($1, $2)
       RETURNING id, nome, role, ativo, api_token, criado_em`,
      [nome, roleFinal]
    );

    // Aqui faz sentido retornar api_token (pra você copiar e usar no front)
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("ERRO POST /users:", err);
    res.status(500).json({ error: "Erro ao criar user", detalhes: err.message });
  }
});

// Atualizar user (admin)
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "ID inválido" });

if (req.user.role !== "adm") {
   return res.status(403).json({ error: "Apenas admin" });
}


    const { nome, role, ativo } = req.body;

    if (nome === undefined || role === undefined || ativo === undefined) {
      return res.status(400).json({
        error: "No PUT, envie todos os campos: nome, role, ativo"
      });
    }

    const roleFinal = role === "adm" ? "adm" : "user";
    const ativoFinal = Boolean(ativo);

    const result = await pool.query(
      `UPDATE public.users
       SET nome = $1, role = $2, ativo = $3
       WHERE id = $4
       RETURNING id, nome, role, ativo, criado_em`,
      [nome, roleFinal, ativoFinal, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "User não encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("ERRO PUT /users/:id:", err);
    res.status(500).json({ error: "Erro ao atualizar user", detalhes: err.message });
  }
});


module.exports = router;
