console.log("Sistema iniciado");

const API_BASE =
  location.hostname.includes("onrender.com")
    ? "https://turism-system-backend.onrender.com"
    : "http://127.0.0.1:3000";

let CURRENT_USER = null;
let CURRENT_ROLE = null;
let viagemEditandoId = null;
let recomendacaoSelecionada = null;

let todasRecomendacoes = [];

//funcoes utilitiarias

function fmtDataBR(data) {
  const d = new Date(data);
  return d.toLocaleDateString("pt-BR");
}

function fmtBRL(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function calcularDias(ida, volta) {
  const d1 = new Date(ida);
  const d2 = new Date(volta);
  const diff = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
  return diff;
}

function gerarImagemDestino(destino) {
  return `https://source.unsplash.com/600x400/?${encodeURIComponent(destino)},travel`;
}

function aplicarFiltros() {
  const nome = filtroNomeReco.value.toLowerCase();
  const precoMax = Number(filtroPrecoReco.value);

  const filtradas = RECOMENDACOES_CACHE.filter(r => {
    const matchNome = r.destino.toLowerCase().includes(nome);
    const matchPreco = !precoMax || r.preco_passagem <= precoMax;
    return matchNome && matchPreco;
  });

  renderizarRecomendacoes(filtradas);
}




/* ========================
   AUTH
======================== */

function headersAuth() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  if (!token) return (window.location.href = "auth.html");

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: headersAuth(),
    });

    if (!res.ok) throw new Error();

    const user = await res.json();
    CURRENT_USER = user;
    CURRENT_ROLE = user.role;

    document.getElementById("userInfo").textContent =
      `${user.nome} (${user.role})`;

    configurarInterface();
    registrarEventos();
    carregarViagens();

    if (CURRENT_ROLE === 'adm') {
      document.getElementById("tituloGerenciador").textContent = 'Painel do Administrador';
    } else if (CURRENT_ROLE === 'user') {
      document.getElementById("tituloGerenciador").innerHTML =
        `Seja bem-vindo, <span class="user-nome-destaque">${user.nome}</span>!`;
    }

    if (CURRENT_ROLE === "user") {
      carregarRecomendacoes();
      atualizarContadorCarrinho();
    } else {
      document.getElementById("recoSection").style.display = "none";
    }
  } catch {
    localStorage.removeItem("token");
    window.location.href = "auth.html";
  }
});

/* ========================
   UI
======================== */

function configurarInterface() {
  if (CURRENT_ROLE === "user") {
    document.getElementById("painel-insert").style.display = "none";
  }

  if (CURRENT_ROLE === "adm") {
    document.getElementById("btn-carrinho").style.display = "none";
  }
}

/* ========================
   EVENTOS
======================== */

function registrarEventos() {
  document
    .getElementById("btnLogout")
    ?.addEventListener("click", logout);

  document
    .getElementById("btnSalvar")
    ?.addEventListener("click", inserirViagem);

  document
    .getElementById("btnSalvar_alteracao")
    ?.addEventListener("click", salvarEdicao);

  document
    .getElementById("btnFecharModal")
    ?.addEventListener("click", () =>
      (document.getElementById("modal").style.display = "none")
    );

  document
    .getElementById("btnFecharReco")
    ?.addEventListener("click", () =>
      (document.getElementById("modalReco").style.display = "none")
    );

  document
    .getElementById("btnComprarReco")
    ?.addEventListener("click", adicionarCarrinho);

  document
    .getElementById("btnConfirmarCarrinho")
    ?.addEventListener("click", finalizarCompra);

  document.getElementById("filtroNomeReco")
    ?.addEventListener("input", aplicarFiltros);

  document.getElementById("filtroPrecoReco")
    ?.addEventListener("input", aplicarFiltros);

}

/* ========================
   VIAGENS
======================== */
let paginaViagens = 1;
const limiteViagens = 3;

async function carregarViagens() {
  // 1. Cálculo do OFFSET para o banco de dados
  const offset = (paginaViagens - 1) * limiteViagens;

  try {
    // 2. Busca os dados no servidor
    const res = await fetch(`${API_BASE}/viagens?limit=${limiteViagens}&offset=${offset}`, {
      headers: headersAuth(),
    });

    const viagens = await res.json();

    // 3. Atualização do Título conforme o papel (Role)
    const titulo = document.getElementById("tituloViagens");
    if (titulo) {
      if (CURRENT_ROLE === 'user') {
        titulo.textContent = `Minhas Viagens - Página ${paginaViagens}`;
      } else {
        titulo.textContent = `Lista de Viagens - Página ${paginaViagens}`;
      }
    }

    // 4. Limpeza do container
    const container = document.getElementById("listagem");
    if (!container) return;
    container.innerHTML = "";

    // 5. Verificação de lista vazia
    if (viagens.length === 0) {
      container.innerHTML = "<p style='text-align:center; width:100%; margin-top: 20px; margin-left: 25vw;'>Fim dos registros ou nenhuma viagem encontrada.</p>";
      return;
    }

    // 6. Renderização dos Cards
    viagens.forEach((v) => {
      const card = document.createElement("div");
      card.className = "card";

      // Conteúdo com labels informativos
      card.innerHTML = `
        <h3>${v.destino}</h3>
        <p><span class="label-info">Característica:</span> ${v.caracteristica}</p>
        <p><span class="label-info">Comprador:</span> <strong>${v.comprador}</strong></p>
        <p><span class="label-info">Período:</span> ${v.data_ida?.slice(0, 10)} até ${v.data_volta?.slice(0, 10)}</p>
      `;

      // Logica de botões por permissão
      const acoesDiv = document.createElement("div");
      acoesDiv.className = "actions-viagens";

      if (CURRENT_ROLE === "adm") {
        // Admin vê Editar e Excluir
        acoesDiv.innerHTML = `
          <button class="btn-editar" onclick="abrirModalEdicao(${v.id})">Editar</button>
          <button class="btn-excluir" onclick="deletar(${v.id})">Excluir</button>
        `;
        card.appendChild(acoesDiv);
      } else if (CURRENT_ROLE === "user") {
        // Usuário vê apenas Excluir
        acoesDiv.innerHTML = `
          <button class="btn-excluir" style="width: 100%" onclick="deletar(${v.id})">Excluir minha viagem</button>
        `;
        card.appendChild(acoesDiv);
      }

      // Adiciona o card ao container (fora dos ifs de role)
      container.appendChild(card);
    });

  } catch (error) {
    console.error("Erro ao carregar viagens:", error);
  }
}

// --- CONFIGURAÇÃO DOS BOTÕES DE NAVEGAÇÃO ---

// Botão Seta para Direita (Avançar)
document.getElementById("btn_back")?.addEventListener("click", () => {
  paginaViagens++;
  carregarViagens();
});

// Botão Seta para Esquerda (Voltar)
document.getElementById("btn_load_more")?.addEventListener("click", () => {
  if (paginaViagens > 1) {
    paginaViagens--;
    carregarViagens();
  }
});

async function inserirViagem() {
  const body = {
    destino: campoDestino.value,
    caracteristica: campoCaracteristica.value,
    comprador: campoComprador.value,
    data_ida: campoDataIda.value,
    data_volta: campoDataVolta.value,
  };

  await fetch(`${API_BASE}/viagens`, {
    method: "POST",
    headers: headersAuth(),
    body: JSON.stringify(body),
  });

  carregarViagens();
}

async function deletar(id) {
  await fetch(`${API_BASE}/viagens/${id}`, {
    method: "DELETE",
    headers: headersAuth(),
  });

  carregarViagens();
}

/* ========================
   EDIÇÃO
======================== */

async function abrirModalEdicao(id) {
  const res = await fetch(`${API_BASE}/viagens/${id}`, {
    headers: headersAuth(),
  });

  const v = await res.json();
  viagemEditandoId = id;

  campoDestino_edit.value = v.destino;
  campoCaracteristica_edit.value = v.caracteristica;
  campoComprador_edit.value = v.comprador;
  campoDataIda_edit.value = v.data_ida.slice(0, 10);
  campoDataVolta_edit.value = v.data_volta.slice(0, 10);

  document.getElementById("modal").style.display = "flex";
}

async function salvarEdicao() {
  await fetch(`${API_BASE}/viagens/${viagemEditandoId}`, {
    method: "PUT",
    headers: headersAuth(),
    body: JSON.stringify({
      destino: campoDestino_edit.value,
      caracteristica: campoCaracteristica_edit.value,
      comprador: campoComprador_edit.value,
      data_ida: campoDataIda_edit.value,
      data_volta: campoDataVolta_edit.value,
    }),
  });

  document.getElementById("modal").style.display = "none";
  carregarViagens();
}

/* ========================
   RECOMENDAÇÕES
======================== */

// 1. Variáveis Globais e Configurações
let RECOMENDACOES_CACHE = [];
let dadosFiltradosCards = [];
let paginaCards = 1;
const limiteCards = 4;

// 2. Função de Busca Inicial (API)
async function carregarRecomendacoes() {
  console.log("Iniciando busca de recomendações...");
  try {
    const res = await fetch(`${API_BASE}/recomendacoes`, {
      headers: headersAuth()
    });
    const recos = await res.json();

    RECOMENDACOES_CACHE = recos;
    console.log("Dados carregados no Cache:", RECOMENDACOES_CACHE.length, "itens.");

    // Renderização inicial
    renderizarRecomendacoes(RECOMENDACOES_CACHE);
  } catch (error) {
    console.error("Erro ao carregar recomendações:", error);
  }
}

// 3. Função de Renderização com Paginação
function renderizarRecomendacoes(lista) {
  const container = document.getElementById("recoList");
  if (!container) return;

  dadosFiltradosCards = lista;

  // Lógica de corte para a página atual
  const inicio = (paginaCards - 1) * limiteCards;
  const fim = inicio + limiteCards;
  const itensExibidos = lista.slice(inicio, fim);

  container.innerHTML = "";

  if (lista.length === 0) {
    container.innerHTML = `
            <div style="width:100%; text-align:center; padding: 20px;">
                Nenhum destino encontrado com esses filtros.
            </div>`;
    return;
  }

  itensExibidos.forEach((r) => {
    const dias = calcularDias(r.data_ida, r.data_volta);
    const imgSrc = `assets/recomendacoes/${r.imagem_ref}`;

    const card = document.createElement("div");
    card.className = "reco-card";
    card.innerHTML = `
            <img loading="lazy" class="reco-img" 
                 src="${imgSrc}" 
                 alt="${r.destino}"
                 onerror="this.src='assets/placeholder.webp'">
            <div class="reco-body">
                <p class="reco-title">${r.destino} | ${dias} dias</p>
                <p class="reco-sub">Saindo de São Paulo</p>
                <div class="reco-line">
                    <span>Ida:</span>
                    <div>${fmtDataBR(r.data_ida)}</div>
                </div>
                <div class="reco-line">
                    <span>Volta:</span>
                    <div>${fmtDataBR(r.data_volta)}</div>
                </div>
                <div class="reco-price-label">A partir de</div>
                <div class="reco-price">${fmtBRL(r.preco_passagem)}</div>
                <a href="${r.link_maps}" target="_blank" class="reco-maps">Ver no mapa</a>
            </div>
            <div class="reco-foot">Em até 12x sem juros</div>
        `;

    card.addEventListener("click", (e) => {
      if (e.target.tagName === "A") return;
      abrirModalReco(r.id, r.destino, r.preco_passagem, r.data_ida, r.data_volta);
    });

    container.appendChild(card);
  });
}

// 4. Lógica de Filtros (Resetando a página para 1)
function aplicarFiltros() {
  paginaCards = 1; // Volta para o início ao filtrar
  const termo = document.getElementById("filtro-destino").value.toLowerCase().trim();
  const precoMax = parseFloat(document.getElementById("filtro-preco").value) || Infinity;

  const filtrados = RECOMENDACOES_CACHE.filter(r => {
    const matchNome = r.destino.toLowerCase().includes(termo);
    const preco = parseFloat(r.preco_passagem);
    const matchPreco = isNaN(preco) || preco <= precoMax;
    return matchNome && matchPreco;
  });

  renderizarRecomendacoes(filtrados);
}

// 5. Controles de Navegação (Botões de Seta)
document.getElementById("recoPrev").addEventListener("click", () => {
  if (paginaCards > 1) {
    paginaCards--;
    renderizarRecomendacoes(dadosFiltradosCards);
  }
});

document.getElementById("recoNext").addEventListener("click", () => {
  const totalPaginas = Math.ceil(dadosFiltradosCards.length / limiteCards);
  if (paginaCards < totalPaginas) {
    paginaCards++;
    renderizarRecomendacoes(dadosFiltradosCards);
  }
});

// 6. Modais e Carrinho
function abrirModalReco(id, destino, preco, ida, volta) {
  recomendacaoSelecionada = id;
  recoDestinoTxt.textContent = destino;
  recoPrecoTxt.textContent = fmtBRL(preco);
  recoIdaTxt.textContent = ida.slice(0, 10);
  recoVoltaTxt.textContent = volta.slice(0, 10);
  document.getElementById("modalReco").style.display = "flex";
}

// Fechar modal de recomendação
document.getElementById("btnFecharReco")?.addEventListener("click", () => {
  document.getElementById("modalReco").style.display = "none";
});

async function adicionarCarrinho() {
  const comprador = document.getElementById("recoComprador").value?.trim();

  if (!recomendacaoSelecionada || !comprador) {
    alert("Preencha o nome do comprador.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/carrinho/adicionar`, {
      method: "POST",
      headers: headersAuth(),
      body: JSON.stringify({
        recomendacao_id: Number(recomendacaoSelecionada),
        comprador
      }),
    });

    if (res.ok) {
      document.getElementById("modalReco").style.display = "none";
      document.getElementById("recoComprador").value = "";
      atualizarContadorCarrinho();
    } else {
      alert("Erro ao adicionar no carrinho.");
    }
  } catch (err) {
    console.error(err);
  }
}

// Atribui a função ao botão do modal
document.getElementById("btnComprarReco")?.addEventListener("click", adicionarCarrinho);
/* ========================
   CARRINHO
======================== */

async function abrirCarrinho() {
  const res = await fetch(`${API_BASE}/carrinho`, {
    headers: headersAuth(),
  });

  const itens = await res.json();
  const lista = document.getElementById("carrinhoLista");
  lista.innerHTML = "";

  let total = 0;

  itens.forEach((item) => {
    total += Number(item.preco_passagem);

    lista.innerHTML += `
      <div class="cart-item">
        <strong>${item.destino}</strong>
        <p>R$ ${item.preco_passagem}</p>
        <button onclick="removerCarrinho(${item.id})">Remover</button>
      </div>
    `;
  });

  document.getElementById("cart-total").textContent =
    `R$ ${total.toFixed(2)}`;

  document.getElementById("carrinhoOverlay").style.display = "flex";
}

function fecharCarrinho() {
  document.getElementById("carrinhoOverlay").style.display = "none";
}

async function removerCarrinho(id) {
  await fetch(`${API_BASE}/carrinho/${id}`, {
    method: "DELETE",
    headers: headersAuth(),
  });

  abrirCarrinho();
  atualizarContadorCarrinho();
}

async function finalizarCompra() {
  await fetch(`${API_BASE}/carrinho/finalizar`, {
    method: "POST",
    headers: headersAuth(),
  });

  fecharCarrinho();
  atualizarContadorCarrinho();
  carregarViagens();
}

async function atualizarContadorCarrinho() {
  const res = await fetch(`${API_BASE}/carrinho`, {
    headers: headersAuth(),
  });

  const itens = await res.json();
  document.getElementById("contador-carrinho").textContent = itens.length;
}

/* ========================
   LOGOUT
======================== */

function logout() {
  localStorage.removeItem("token");
  window.location.href = "auth.html";
}
