const express = require("express");
const router = express.Router();
const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");


const verificarToken = require("../middleware/verificarToken");


router.get("/me", verificarToken, async (req, res) => {
    try {
        const user = await pool.query(
            "SELECT id, nome, email, role FROM users WHERE id = $1",
            [req.user.id]
        );

        if (user.rows.length === 0) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }

        res.json(user.rows[0]);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao buscar usuário" });
    }
});

router.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Usuário não encontrado" });
    }

    const user = result.rows[0];

    const senhaValida = await bcrypt.compare(senha, user.senha);

    if (!senhaValida) {
      return res.status(400).json({ error: "Senha incorreta" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, nome: user.nome },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nome: user.nome,
        role: user.role
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no login" });
  }
});


router.post("/register", async (req, res) => {
    try {
        const { nome, email, senha } = req.body;

        const senhaHash = await bcrypt.hash(senha, 10);

        const existe = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );

        if (existe.rows.length > 0) {
            return res.status(400).json({ error: "Email já cadastrado" });
        }


        const result = await pool.query(
            "INSERT INTO users (nome, email, senha, role) VALUES ($1,$2,$3,'user') RETURNING id, nome, role",
            [nome, email, senhaHash]
        );

        const user = result.rows[0];

        const token = jwt.sign(
            { id: user.id, role: user.role, nome: user.nome },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.status(201).json({
            token,
            user
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro no registro" });
    }
});



module.exports = router;