const express = require("express");
require("dotenv").config();

const cors = require('cors');

const viagensRouter = require("./server/routes/viagens");
const autenticarAPIKey = require("./authorization");

const app = express();
app.use(cors());
app.use(express.json());


// =====================
// Rotas principais
// =====================
app.use(autenticarAPIKey)
app.use("/viagens", viagensRouter);

// Rota raiz
app.get("/", (req, res) => {
  res.send("🌎 API de Viagens rodando! Acesse a documentação em /api-docs");
});

// =====================
// Servidor
// =====================
const PORT = process.env.PORT || 3000;


app.listen(PORT, () => {
  console.log("✅ Servidor rodando em http://127.0.0.1:3000");
});
