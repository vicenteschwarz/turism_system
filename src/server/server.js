const express = require("express");
require("dotenv").config();
const cors = require("cors");

const viagensRouter = require("./routes/viagens");
const recomendacoesRouter = require("./routes/recomendacoes");
const userRouter = require("./routes/users");

const { autenticarAPIKey, identificarUser } = require("./authorization");

const app = express();
app.use(cors())

app.use(express.json());

//authnticacçoes
app.use(autenticarAPIKey);
app.use(identificarUser);

// API
app.use("/viagens", viagensRouter);
app.use("/recomendacoes", recomendacoesRouter);
app.use("/users", userRouter);

// Health check
app.get("/", (req, res) => res.send("API Travel Up online ✅"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ API ouvindo na porta ${PORT}`);
});
