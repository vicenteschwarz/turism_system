require("dotenv").config();
const pool = require("./db");

// 1) Verifica só a API KEY (sem limite)
async function autenticarAPIKey(req, res, next) {
  try {
    const apiKey = req.header("minha-chave");

    if (!apiKey) {
      return res.status(401).json({ mensagem: "Chave não fornecida (minha-chave)!" });
    }

    const result = await pool.query(
      "SELECT api_key FROM public.api_keys WHERE api_key = $1",
      [apiKey]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ mensagem: "Chave inválida!" });
    }

    return next();
  } catch (err) {
    console.error("ERRO autenticarAPIKey:", err);
    return res.status(500).json({ mensagem: "Erro interno (API KEY)" });
  }
}

// 2) Identifica usuário pelo token (pra role/filtrar viagens)
async function identificarUser(req, res, next) {
  try {
    const token = req.header("x-user-token");

    // Se quiser que algumas rotas funcionem sem usuário logado,
    // deixe opcional:
    if (!token) {
      req.user = null;
      return next();
    }

    const result = await pool.query(
      "SELECT id, nome, role, ativo FROM public.users WHERE senha::text = $1",
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ mensagem: "Token de usuário inválido!" });
    }

    const user = result.rows[0];
    if (user.ativo === false) {
      return res.status(403).json({ mensagem: "Usuário desativado!" });
    }

    req.user = user; // { id, nome, role, ativo }
    return next();
  } catch (err) {
    console.error("ERRO identificarUser:", err);
    return res.status(500).json({ mensagem: "Erro interno (USER TOKEN)" });
  }
}


//analisar helpers depois (ver se é tipo pop-up)
// Helpers (pra usar nas rotas)
function exigirUser(req, res, next) {
  if (!req.user) return res.status(401).json({ mensagem: "Informe x-user-token" });
  next();
}

function somenteAdm(req, res, next) {
  if (!req.user) return res.status(401).json({ mensagem: "Informe x-user-token" });
  if (req.user.role !== "adm") return res.status(403).json({ mensagem: "Apenas admin" });
  next();
}

module.exports = {
  autenticarAPIKey,
  identificarUser,
  exigirUser,
  somenteAdm,
};
