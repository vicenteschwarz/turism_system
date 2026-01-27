const API = "http://127.0.0.1:3000/viagens";
//const API = "https://municipios-senac-main-1-uali.onrender.com/viagens";

const CLIENT_API_KEY = "SUA_CHAVE_SECRETA_MUITO_FORTE_123456";

const listagem = document.getElementById("listagem");
const btnCarregar = document.getElementById("btn");
const btnSalvar = document.getElementById("btnSalvar");
const btnSalvarAlteracao = document.getElementById("btnSalvar_alteracao");
const btnLoadMore = document.getElementById("btn_load_more");
const btnBack = document.getElementById("btn_back");
const btnFecharModal = document.getElementById("btnFecharModal");

let limit = 3;
let offset = 0;
let lastScrollTop = 0;

const modal = document.getElementById("modal");
let idViagemEdit = null; // Guardar o ID da viagem para editar

// --------------------
// Eventos
// --------------------
btnCarregar.addEventListener("click", () => carregarViagens("inicio"));
btnSalvar.addEventListener("click", inserirViagem);
btnSalvarAlteracao.addEventListener("click", alterarViagem);
btnLoadMore.addEventListener("click", () => carregarViagens("mais"));
btnBack.addEventListener("click", () => carregarViagens("menos"));

if (btnFecharModal) {
  btnFecharModal.addEventListener("click", () => {
    modal.style.display = "none";
  });
}

// --------------------
// Header padrão
// --------------------
function headersPadrao(extra = {}) {
  return {
    "minha-chave": CLIENT_API_KEY,
    ...extra,
  };
}

// --------------------
// Helpers
// --------------------
function toDateInputValue(value) {
  // aceita 'YYYY-MM-DD' ou ISO e devolve 'YYYY-MM-DD' (necessário pro input date)
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function formatarDataBR(value) {
  const v = toDateInputValue(value);
  if (!v) return "-";
  const [yyyy, mm, dd] = v.split("-");
  return `${dd}/${mm}/${yyyy}`;
}

function validarDatas(data_ida, data_volta) {
  if (!data_ida || !data_volta) return false;
  return new Date(data_volta) >= new Date(data_ida);
}

// --------------------
// LISTAR VIAGENS (GET)
// --------------------
async function carregarViagens(acao = "") {
  if (acao === "inicio") offset = 0;

  if (acao === "mais") offset += limit;

  if (acao === "menos") {
    offset -= limit;
    if (offset < 0) offset = 0;
  }

  try {
    const url = `${API}/?limit=${limit}&offset=${offset}`;
    const resposta = await fetch(url, {
      headers: headersPadrao(),
    });

    if (!resposta.ok) {
      throw new Error(`Erro ao carregar! Status: ${resposta.status}`);
    }

    const dados = await resposta.json();

    listagem.innerHTML = "";
    dados.forEach((v) => criarCard(v));
  } catch (erro) {
    console.error("Erro ao carregar:", erro.message);
  }
}

// --------------------
// CRIAR CARD NO FRONT
// --------------------
function criarCard(v) {
  const card = document.createElement("div");
  card.classList.add("card");

  card.innerHTML = `
    <h3>${v.destino}</h3>
    <p><strong>Característica:</strong> ${v.caracteristica}</p>
    <p><strong>Comprador:</strong> ${v.comprador}</p>
    <p><strong>Ida:</strong> ${formatarDataBR(v.data_ida)} • <strong>Volta:</strong> ${formatarDataBR(v.data_volta)}</p>

    <div class="card-actions">
      <button class="btn-delete" onclick="deletar(${v.id})">Deletar</button>
      <button onclick="modalEdicao(${v.id})">Editar</button>
    </div>
  `;

  listagem.appendChild(card);
}

// --------------------
// INSERIR VIAGEM (POST)
// --------------------
async function inserirViagem() {
  const destino = document.getElementById("campoDestino").value.trim();
  const caracteristica = document.getElementById("campoCaracteristica").value.trim();
  const comprador = document.getElementById("campoComprador").value.trim();
  const data_ida = document.getElementById("campoDataIda").value;
  const data_volta = document.getElementById("campoDataVolta").value;

  if (!destino || !caracteristica || !comprador || !data_ida || !data_volta) {
    alert("Preencha todos os campos: destino, caracteristica, comprador, data_ida, data_volta");
    return;
  }

  if (!validarDatas(data_ida, data_volta)) {
    alert("A data de volta não pode ser menor que a data de ida.");
    return;
  }

  const novaViagem = { destino, caracteristica, comprador, data_ida, data_volta };

  try {
    const resposta = await fetch(`${API}`, {
      method: "POST",
      headers: headersPadrao({ "Content-Type": "application/json" }),
      body: JSON.stringify(novaViagem),
    });

    if (!resposta.ok) {
      throw new Error(`Erro ao inserir! Status: ${resposta.status}`);
    }

    // limpar inputs (opcional)
    document.getElementById("campoDestino").value = "";
    document.getElementById("campoCaracteristica").value = "";
    document.getElementById("campoComprador").value = "";
    document.getElementById("campoDataIda").value = "";
    document.getElementById("campoDataVolta").value = "";

    carregarViagens("inicio");
  } catch (erro) {
    console.error("Erro ao inserir:", erro.message);
  }
}

// --------------------
// DELETAR VIAGEM (DELETE)
// --------------------
async function deletar(id) {
  try {
    const resposta = await fetch(`${API}/${id}`, {
      method: "DELETE",
      headers: headersPadrao(),
    });

    if (!resposta.ok) {
      throw new Error(`Erro ao deletar! Status: ${resposta.status}`);
    }

    carregarViagens();
  } catch (erro) {
    console.error("Erro ao deletar:", erro.message);
  }
}

// --------------------
// ABRIR MODAL + CARREGAR DADOS (GET /:id)
// --------------------
async function modalEdicao(id) {
  idViagemEdit = id;

  try {
    const resposta = await fetch(`${API}/${id}`, {
      headers: headersPadrao(),
    });

    if (!resposta.ok) {
      throw new Error(`Erro ao buscar viagem! Status: ${resposta.status}`);
    }

    const viagem = await resposta.json();

    document.getElementById("campoDestino_edit").value = viagem.destino ?? "";
    document.getElementById("campoCaracteristica_edit").value = viagem.caracteristica ?? "";
    document.getElementById("campoComprador_edit").value = viagem.comprador ?? "";
    document.getElementById("campoDataIda_edit").value = toDateInputValue(viagem.data_ida);
    document.getElementById("campoDataVolta_edit").value = toDateInputValue(viagem.data_volta);

    modal.style.display = "block";
  } catch (erro) {
    console.error("Erro ao carregar dados para edição:", erro.message);
  }
}

// --------------------
// ALTERAR VIAGEM (PUT)
// --------------------
async function alterarViagem() {
  const destino = document.getElementById("campoDestino_edit").value.trim();
  const caracteristica = document.getElementById("campoCaracteristica_edit").value.trim();
  const comprador = document.getElementById("campoComprador_edit").value.trim();
  const data_ida = document.getElementById("campoDataIda_edit").value;
  const data_volta = document.getElementById("campoDataVolta_edit").value;

  if (!destino || !caracteristica || !comprador || !data_ida || !data_volta) {
    alert("Preencha todos os campos para editar.");
    return;
  }

  if (!validarDatas(data_ida, data_volta)) {
    alert("A data de volta não pode ser menor que a data de ida.");
    return;
  }

  const viagemAlterada = { destino, caracteristica, comprador, data_ida, data_volta };

  try {
    const resposta = await fetch(`${API}/${idViagemEdit}`, {
      method: "PUT",
      headers: headersPadrao({ "Content-Type": "application/json" }),
      body: JSON.stringify(viagemAlterada),
    });

    if (!resposta.ok) {
      throw new Error(`Erro ao alterar! Status: ${resposta.status}`);
    }

    carregarViagens();
    modal.style.display = "none";
  } catch (erro) {
    console.error("Erro ao alterar:", erro.message);
  }
}

// Fechar o modal ao clicar fora dele
window.onclick = function (event) {
  if (event.target === modal) {
    modal.style.display = "none";
  }
};

window.addEventListener("scroll", () => {
  let scrollTop = window.pageYOffset;
  if (scrollTop > lastScrollTop) {
    // rolou pra baixo
  } else {
    // rolou pra cima
  }
  lastScrollTop = scrollTop;
});
