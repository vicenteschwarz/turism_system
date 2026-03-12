const express = require("express");
require("dotenv").config();
const cors = require("cors");

const verificarToken = require("./middleware/verificarToken");

const viagensRouter = require("./routes/viagens");
const recomendacoesRouter = require("./routes/recomendacoes");
const userRouter = require("./routes/users");
const carrinhoRouter = require('./routes/carrinho')
const authRouter = require("./routes/auth");


const app = express();
app.use(cors())

app.use(express.json());

//authnticacçoes
//app.use(identificarUser);

// API
app.use("/viagens", verificarToken, viagensRouter);
app.use("/recomendacoes", verificarToken, recomendacoesRouter);
app.use("/users", verificarToken, userRouter); //verificarToken adicionar
app.use("/carrinho", verificarToken, carrinhoRouter);
app.use("/auth", authRouter);


// Health check
app.get("/", (req, res) => res.send("API Travel Up online ✅"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ API ouvindo na porta ${PORT}`);
});
