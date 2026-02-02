const express = require("express");
require("dotenv").config();
const cors = require("cors");

const viagensRouter = require("./routes/viagens");
const recomendacoesRouter = require("./routes/recomendacoes");
const autenticarAPIKey = require("./authorization");

const app = express();
app.use(cors())

app.use(express.json());

// API
app.use("/viagens", autenticarAPIKey, viagensRouter);
app.use("/recomendacoes", autenticarAPIKey, recomendacoesRouter);

// Health check
app.get("/", (req, res) => res.send("API Travel Up online ✅"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ API ouvindo na porta ${PORT}`);
});
