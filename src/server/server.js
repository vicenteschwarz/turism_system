const express = require("express");
require("dotenv").config();
const cors = require("cors");
const path = require("path");

const viagensRouter = require("./routes/viagens");
const recomendacoesRouter = require("./routes/recomendacoes");
const autenticarAPIKey = require("./authorization");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Servir FRONT estático (HTML/CSS/JS)
app.use(express.static(path.join(__dirname, "front")));

// ✅ Servir ASSETS (imagens do projeto)
app.use("/assets", express.static(path.join(__dirname, "assets")));

// ✅ Protege só a API (não trava os arquivos estáticos)
app.use("/viagens", autenticarAPIKey, viagensRouter);
app.use("/recomendacoes", autenticarAPIKey, recomendacoesRouter);

// (Opcional) garantir que / abra o index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "front", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ http://127.0.0.1:${PORT}`));
