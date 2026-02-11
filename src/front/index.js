const API_BASE =
  location.hostname.includes("onrender.com")
    ? "https://turism-system-frontend.onrender.com"
    : "http://127.0.0.1:3000";

const API = `${API_BASE}/viagens`;

const CLIENT_API_KEY = "SUA_CHAVE_SECRETA_MUITO_FORTE_123456";

let CARRINHO = [];

const listagem = document.getElementById("listagem");
const btnCarregar = document.getElementById("btn");
const btnSalvar = document.getElementById("btnSalvar");
const btnSalvarAlteracao = document.getElementById("btnSalvar_alteracao");
const btnLoadMore = document.getElementById("btn_load_more");
const btnBack = document.getElementById("btn_back");
const btnFecharModal = document.getElementById("btnFecharModal");

//botões ida e volta
const recoList = document.getElementById("recoList");
const recoPrev = document.getElementById("recoPrev");
const recoNext = document.getElementById("recoNext");


//modal de recomendações
const modalReco = document.getElementById("modalReco");
const recoDestinoTxt = document.getElementById("recoDestinoTxt");
const recoPrecoTxt = document.getElementById("recoPrecoTxt");
const recoIdaTxt = document.getElementById("recoIdaTxt");
const recoVoltaTxt = document.getElementById("recoVoltaTxt");
const recoComprador = document.getElementById("recoComprador");
const btnComprarReco = document.getElementById("btnComprarReco");
const btnFecharReco = document.getElementById("btnFecharReco");

let limit = 3;
let offset = 0;
let lastScrollTop = 0;

const modal = document.getElementById("modal");
let idViagemEdit = null; // Guardar o ID da viagem para editar

let USER_TOKEN = localStorage.getItem("USER_TOKEN") || "";
let CURRENT_ROLE = "user";
let CURRENT_USER_NAME = '';

const loginOverlay = document.getElementById("loginOverlay");
const tokenInput = document.getElementById("tokenInput");
const btnLogin = document.getElementById("btnLogin");
const loginMsg = document.getElementById("loginMsg");
const userInfo = document.getElementById("userInfo");
const btnLogout = document.getElementById("btnLogout");

// Se quiser forçar pedir token sempre, descomente:
// localStorage.removeItem("USER_TOKEN");

window.trocarToken = function () {
  localStorage.removeItem("USER_TOKEN");
  location.reload();
};


// funções copiadas pra arrumar o layout das data q tava bugado no html/css (as 3 d baixo)

let recoSelecionada = null;

function fmtBRL(v) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function onlyDatePart(s) {
  return (s ?? "").toString().slice(0, 10); // "YYYY-MM-DD"
}

function fmtDataBR(value) {
  const d = onlyDatePart(value);
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}


// pra calcular os dias das viagens

function diasEntre(dataIda, dataVolta) {
  const a = onlyDatePart(dataIda);
  const b = onlyDatePart(dataVolta);

  const [y1, m1, d1] = a.split("-").map(Number);
  const [y2, m2, d2] = b.split("-").map(Number);

  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);

  const diff = Math.round((utc2 - utc1) / 86400000);
  return Math.max(1, diff);
}


function abrirModalReco(reco) {
  recoSelecionada = reco;
  recoDestinoTxt.textContent = reco.destino;
  recoPrecoTxt.textContent = fmtBRL(reco.preco_passagem);
  recoIdaTxt.textContent = fmtDataBR(reco.data_ida);
  recoVoltaTxt.textContent = fmtDataBR(reco.data_volta);
  recoComprador.value = CURRENT_USER_NAME //deixar pra editar se quiser
  modalReco.style.display = "block";
}

function fecharModalReco() {
  modalReco.style.display = "none";
  recoSelecionada = null;
}

btnFecharReco?.addEventListener("click", fecharModalReco);
modalReco?.addEventListener("click", (e) => {
  if (e.target === modalReco) fecharModalReco();
});

btnComprarReco?.addEventListener("click", () => {
  if (!recoSelecionada) return;

  const comprador = recoComprador.value.trim();

  if (!comprador) {
    alert("Informe o comprador.");
    return;
  }

  CARRINHO.push({
    ...recoSelecionada,
    comprador
  });

  fecharModalReco();
  abrirCarrinho();
});


async function carregarRecomendacoes() {

  //se for admin, esconde a seção inteira e não carrega nada
  if (CURRENT_ROLE === "adm") {
    const secao = document.getElementById("recoSection");
    if (secao) secao.style.display = "none";
    return;
  }

  const resp = await fetch(`${API_BASE}/recomendacoes?limit=50&offset=0&ordem=desc`, {
    headers: headersPadrao()
  });

  if (!resp.ok) {
    console.error("Erro ao carregar recomendações:", await resp.text());
    return;
  }

  const recos = await resp.json();
  recoList.innerHTML = "";

  recos.forEach((r) => {
    const dias = diasEntre(r.data_ida, r.data_volta);
    const imgSrc = `./assets/recomendacoes/${r.imagem_ref}`;

    const card = document.createElement("div");
    card.className = "reco-card";
    card.innerHTML = `
      <img class="reco-img" src="${imgSrc}" alt="${r.destino}">
      <div class="reco-body">
        <p class="reco-title">${r.destino} | ${dias} dias</p>
        <p class="reco-sub">Saindo de São Paulo</p>

        <div class="reco-line"><span>Ida:</span><div>${fmtDataBR(r.data_ida)}</div></div>
        <div class="reco-line"><span>Volta:</span><div>${fmtDataBR(r.data_volta)}</div></div>

        <div class="reco-price-label">A partir de</div>
        <div class="reco-price">${fmtBRL(r.preco_passagem)}</div>
      </div>
      <div class="reco-foot">Em até 12x sem juros</div>
    `;

    card.addEventListener("click", () => abrirModalReco(r));
    recoList.appendChild(card);
  });
}


function scrollReco(dir) {
  const amount = 300; // largura aproximada do card
  recoList.scrollLeft += dir * amount;
}

recoPrev?.addEventListener("click", () => scrollReco(-1));
recoNext?.addEventListener("click", () => scrollReco(1));

document.addEventListener("DOMContentLoaded", async () => {
  if (!USER_TOKEN) {
    mostrarLogin();
    return;
  }

  try {
    await entrar(USER_TOKEN);
  } catch (e) {
    console.error(e);
    sair();
  }
});

function mostrarLogin(msg = "") {
  loginMsg.textContent = msg;
  loginOverlay.style.display = "flex";
  if (tokenInput) tokenInput.value = USER_TOKEN || "";
}

function esconderLogin() {
  loginOverlay.style.display = "none";
  loginMsg.textContent = "";
}

async function carregarMe() {
  const resp = await fetch(`${API_BASE}/users/me`, { headers: headersPadrao() });
  if (!resp.ok) throw new Error(await resp.text());

  const me = await resp.json();
  CURRENT_ROLE = me.role;
  CURRENT_USER_NAME = me.nome;

  if (userInfo) {
    userInfo.textContent = `${me.nome} • ${me.role}`;
  }

  if (CURRENT_ROLE === "adm") {
    const secaoReco = document.getElementById("recoSection");
    if (secaoReco) secaoReco.style.display = "none";
  }

  const titulo = document.getElementById("tituloViagens");

  if (CURRENT_ROLE === "user") {
    titulo.textContent = "Minhas Viagens";
  } else {
    titulo.textContent = "Lista de Viagens";
  }

  // esconde a seção de "Nova Viagem" para user comum
  if (CURRENT_ROLE !== "adm") {
    const cardNovaViagem = document.getElementById("btnSalvar")?.closest(".card");
    if (cardNovaViagem) cardNovaViagem.style.display = "none";
  }
}

async function entrar(token) {
  USER_TOKEN = token.trim();
  localStorage.setItem("USER_TOKEN", USER_TOKEN);

  await carregarMe();       // valida token e pega role
  esconderLogin();

  // carrega dados depois de logar
  if (CURRENT_ROLE !== "adm") {
    await carregarRecomendacoes();
  }

  await carregarViagens("inicio");
}

function sair() {
  localStorage.removeItem("USER_TOKEN");
  USER_TOKEN = "";
  CURRENT_ROLE = "user";
  if (userInfo) userInfo.textContent = "";
  mostrarLogin();
}

btnLogin?.addEventListener("click", async () => {
  try {
    const t = (tokenInput.value || "").trim();
    if (!t) return mostrarLogin();

    await entrar(t);
  } catch (e) {
    console.error(e);
    mostrarLogin("Token inválido ou erro ao validar.");
  }
});

btnLogout?.addEventListener("click", () => sair());



async function carregarTokenUsuario() {
  const resp = await fetch(`${API_BASE}/users/me`, { headers: headersPadrao() });

  if (!resp.ok) {
    console.error("Falha /users/me:", await resp.text());
    alert("Token inválido ou ausente. Recarregue e informe o token correto.");
    return;
  }

  const me = await resp.json();
  CURRENT_ROLE = me.role;

  // Se não for admin, esconde o formulário de inserir e remove botões de editar/deletar
  if (CURRENT_ROLE !== "adm") {
    const cardNovaViagem = btnSalvar?.closest(".card");
    if (cardNovaViagem) cardNovaViagem.style.display = "none";
  }
}


//



// --------------------
// Eventos
// --------------------
btnCarregar.addEventListener("click", () => carregarViagens("inicio"));
btnSalvar.addEventListener("click", inserirViagem);
btnSalvarAlteracao.addEventListener("click", alterarViagem);
btnLoadMore.addEventListener("click", () => carregarViagens("menos"));
btnBack.addEventListener("click", () => carregarViagens("mais"));

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
    "x-user-token": USER_TOKEN,
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

  const actionsHtml = (CURRENT_ROLE === "adm")
    ? `
      <div class="card-actions">
        <button class="btn-delete" onclick="deletar(${v.id})">Deletar</button>
        <button class="btn-delete" onclick="modalEdicao(${v.id})">Editar</button>
      </div>
    `
    : "";

  card.innerHTML = `
    <h3>${v.destino}</h3>
    <p><strong>Característica:</strong> ${v.caracteristica}</p>
    <p><strong>Comprador:</strong> ${v.comprador}</p>
    <p><strong>Ida:</strong> ${formatarDataBR(v.data_ida)} • <strong>Volta:</strong> ${formatarDataBR(v.data_volta)}</p>
    ${actionsHtml}
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





//funcoes do carrinho

function abrirCarrinho() {
  const overlay = document.getElementById("carrinhoOverlay");
  overlay.style.display = "flex";
  renderizarCarrinho();
}

function fecharCarrinho() {
  const overlay = document.getElementById("carrinhoOverlay");
  overlay.style.display = "none";
}

function renderizarCarrinho() {
  const lista = document.getElementById("carrinhoLista");
  lista.innerHTML = "";

  CARRINHO.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <div class="cart-item-header">
        <strong>${item.destino}</strong>
        <button class="remove-btn" onclick="removerDoCarrinho(${index})">×</button>
      </div>

      <div class="cart-price">${fmtBRL(item.preco_passagem)}</div>

      <input 
        class="cart-input"
        type="text" 
        value="${item.comprador}"
        onchange="CARRINHO[${index}].comprador=this.value"
      >
    `;

    lista.appendChild(div);
  });

  atualizarTotalUI(); // aqui chama a funç~cao da soma
}


function removerDoCarrinho(index) {
  CARRINHO.splice(index, 1);
  renderizarCarrinho();
}

document.getElementById("btnConfirmarCarrinho")
  ?.addEventListener("click", async () => {

    for (let item of CARRINHO) {
      await fetch(
        `${API_BASE}/viagens/from-recomendacao/${item.id}`,
        {
          method: "POST",
          headers: headersPadrao({ "Content-Type": "application/json" }),
          body: JSON.stringify({ comprador: item.comprador }),
        }
      );
    }

    CARRINHO = [];
    fecharCarrinho();
    carregarViagens("inicio");
    alert("Viagens confirmadas!");
  });

  function calcularTotalCarrinho() {
  const total = CARRINHO.reduce((soma, item) => {
    return soma + Number(item.preco_passagem);
  }, 0);

  return total;
}

function atualizarTotalUI() {
  const total = calcularTotalCarrinho();
  document.getElementById("cart-total").textContent = fmtBRL(total);
}
