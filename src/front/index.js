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

/* ========================
   TOAST SYSTEM
   Substitui todos os alert() por notificações elegantes
======================== */

function showToast(mensagem, tipo = "success", duracao = 4000) {
  // tipos: "success" | "error" | "info" | "warning"
  const configs = {
    success: { icon: "✅", cor: "#16a34a", bg: "#f0fdf4", borda: "#a7f3d0" },
    error:   { icon: "❌", cor: "#dc2626", bg: "#fff1f2", borda: "#fecaca" },
    info:    { icon: "ℹ️",  cor: "#2563eb", bg: "#eff6ff", borda: "#bfdbfe" },
    warning: { icon: "⚠️", cor: "#d97706", bg: "#fffbeb", borda: "#fcd34d" },
  };

  const c = configs[tipo] || configs.info;

  // Container persistente (cria uma vez, reutiliza)
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.style.cssText = `
    background: ${c.bg};
    border: 1px solid ${c.borda};
    border-left: 4px solid ${c.cor};
    border-radius: 12px;
    padding: 14px 16px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    min-width: 280px;
    max-width: 360px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.1);
    pointer-events: all;
    transform: translateX(120%);
    transition: transform 0.35s cubic-bezier(.22,.68,0,1.2), opacity 0.3s ease;
    opacity: 0;
    font-family: inherit;
  `;

  toast.innerHTML = `
    <span style="font-size:18px;flex-shrink:0;margin-top:1px">${c.icon}</span>
    <span style="flex:1;font-size:14px;color:#1b1f1c;line-height:1.5">${mensagem}</span>
    <button onclick="this.parentElement.remove()" style="
      background:none;border:none;cursor:pointer;
      color:#9ca3af;font-size:18px;padding:0;line-height:1;
      flex-shrink:0;margin-top:-1px
    ">x</button>
  `;

  container.appendChild(toast);

  // Animação de entrada
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.transform = "translateX(0)";
      toast.style.opacity = "1";
    });
  });

  // Auto-dismiss
  setTimeout(() => {
    toast.style.transform = "translateX(120%)";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 350);
  }, duracao);
}

/* ========================
   SKELETON LOADING
   Mostra placeholders animados enquanto carrega
======================== */

function mostrarSkeletons(qtd = 3) {
  const container = document.getElementById("listagem");
  if (!container) return;
  container.innerHTML = "";

  for (let i = 0; i < qtd; i++) {
    container.innerHTML += `
      <div class="card skeleton-card" style="min-height:220px;gap:12px;display:flex;flex-direction:column">
        <div class="skeleton-line" style="width:60%;height:22px;border-radius:6px"></div>
        <div class="skeleton-line" style="width:90%;height:14px;border-radius:4px"></div>
        <div class="skeleton-line" style="width:75%;height:14px;border-radius:4px"></div>
        <div class="skeleton-line" style="width:80%;height:14px;border-radius:4px"></div>
        <div style="display:flex;gap:10px;margin-top:auto">
          <div class="skeleton-line" style="flex:1;height:38px;border-radius:8px"></div>
          <div class="skeleton-line" style="flex:1;height:38px;border-radius:8px"></div>
        </div>
      </div>
    `;
  }
}

/* ========================
   EMPTY STATES
   Componente visual para lista vazia
======================== */

function emptyStateViagens() {
  return `
    <div style="
      width:100%;
      text-align:center;
      padding:60px 20px;
      color:#6b7b73;
    ">
      <div style="font-size:56px;margin-bottom:16px">&#9992;&#65039;</div>
      <h3 style="font-size:1.2rem;color:#1b1f1c;margin:0 0 8px">
        Nenhuma viagem encontrada
      </h3>
      <p style="font-size:0.875rem;margin:0 0 24px;color:#6b7b73;max-width:320px;margin-left:auto;margin-right:auto">
        ${CURRENT_ROLE === "adm"
          ? "Cadastre a primeira viagem usando o formulário acima."
          : "Suas viagens confirmadas aparecerão aqui."}
      </p>
      ${CURRENT_ROLE === "adm" ? `
        <button onclick="document.getElementById('campoDestino').focus();document.getElementById('painel-insert').scrollIntoView({behavior:'smooth'})"
          style="
            background:#539466;color:#fff;border:none;
            padding:12px 28px;border-radius:10px;
            font-weight:700;cursor:pointer;font-size:0.9rem
          ">
          + Cadastrar viagem
        </button>
      ` : ""}
    </div>
  `;
}

function emptyStateRecomendacoes() {
  return `
    <div style="width:100%;text-align:center;padding:40px 20px;color:#6b7b73">
      <div style="font-size:40px;margin-bottom:12px">&#128269;</div>
      <p style="font-size:0.9rem;margin:0">
        Nenhum destino encontrado com esses filtros.
      </p>
      <button onclick="document.getElementById('filtro-destino').value='';document.getElementById('filtro-preco').value='';aplicarFiltros()"
        style="
          margin-top:14px;background:transparent;
          border:1px solid #d5ded9;color:#539466;
          padding:8px 20px;border-radius:8px;
          cursor:pointer;font-weight:600;font-size:0.85rem
        ">
        Limpar filtros
      </button>
    </div>
  `;
}

/* ========================
   FUNCOES UTILITARIAS
======================== */

function fmtDataBR(data) {
  const d = new Date(data);
  return d.toLocaleDateString("pt-BR");
}

function fmtBRL(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function calcularDias(ida, volta) {
  const d1 = new Date(ida);
  const d2 = new Date(volta);
  return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
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

    // Avatar com iniciais
    const nomes = user.nome.split(" ");
    const iniciais = (nomes[0][0] + (nomes[1] ? nomes[1][0] : "")).toUpperCase();
    document.getElementById("userAvatar").textContent = iniciais;
    document.getElementById("userName").textContent = user.nome;
    document.getElementById("userRoleText").textContent = user.role.toUpperCase();

    // Dropdown do perfil
    const profile = document.getElementById("userProfile");
    profile.addEventListener("click", (e) => {
      e.stopPropagation();
      profile.classList.toggle("active");
    });
    window.addEventListener("click", () => profile.classList.remove("active"));

    configurarInterface();
    registrarEventos();

    // AUTO-LOAD: mostra skeletons e carrega viagens sem clicar em botão
    mostrarSkeletons(3);
    carregarViagens();

    gerenciarVisualizacaoAdmin();

    if (CURRENT_ROLE === "adm") {
      document.getElementById("tituloGerenciador").textContent = "Painel do Administrador";
    } else if (CURRENT_ROLE === "user") {
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
  document.getElementById("btnSalvar")?.addEventListener("click", inserirViagem);
  document.getElementById("btnSalvar_alteracao")?.addEventListener("click", salvarEdicao);

  document.getElementById("btnFecharModal")?.addEventListener("click", () => {
    document.getElementById("modal").style.display = "none";
  });

  document.getElementById("btnFecharReco")?.addEventListener("click", () => {
    document.getElementById("modalReco").style.display = "none";
  });

  document.getElementById("btnComprarReco")?.addEventListener("click", adicionarCarrinho);
  document.getElementById("btnConfirmarCarrinho")?.addEventListener("click", finalizarCompra);

  document.getElementById("filtroNomeReco")?.addEventListener("input", aplicarFiltros);
  document.getElementById("filtroPrecoReco")?.addEventListener("input", aplicarFiltros);

  document.getElementById("btnLogoutDropdown")?.addEventListener("click", logout);

  document.getElementById("btnConfirmarExclusao")?.addEventListener("click", async () => {
    if (!idParaDeletarGlobal) return;

    const btnConfirmar = document.getElementById("btnConfirmarExclusao");
    btnConfirmar.textContent = "Excluindo...";
    btnConfirmar.disabled = true;

    try {
      const res = await fetch(`${API_BASE}/viagens/${idParaDeletarGlobal}`, {
        method: "DELETE",
        headers: headersAuth(),
      });

      document.getElementById("modalConfirmacao").style.display = "none";
      idParaDeletarGlobal = null;

      if (res.ok) {
        showToast("Viagem excluída com sucesso.", "success");
      } else {
        showToast("Erro ao excluir a viagem.", "error");
      }

      carregarViagens();
    } catch {
      showToast("Erro de conexão ao excluir.", "error");
    } finally {
      btnConfirmar.textContent = "Sim, excluir";
      btnConfirmar.disabled = false;
    }
  });

  document.getElementById("btnCancelarExclusao")?.addEventListener("click", () => {
    document.getElementById("modalConfirmacao").style.display = "none";
    idParaDeletarGlobal = null;
  });
}

/* ========================
   VIAGENS
======================== */

let paginaViagens = 1;
const limiteViagens = 3;

async function carregarViagens() {
  const offset = (paginaViagens - 1) * limiteViagens;
  mostrarSkeletons(limiteViagens);

  try {
    const res = await fetch(
      `${API_BASE}/viagens?limit=${limiteViagens}&offset=${offset}`,
      { headers: headersAuth() }
    );

    const viagens = await res.json();

    const titulo = document.getElementById("tituloViagens");
    if (titulo) {
      titulo.textContent =
        CURRENT_ROLE === "user"
          ? `Minhas Viagens — Página ${paginaViagens}`
          : `Lista de Viagens — Página ${paginaViagens}`;
    }

    const container = document.getElementById("listagem");
    if (!container) return;
    container.innerHTML = "";

    if (!viagens || viagens.length === 0) {
      container.innerHTML = emptyStateViagens();
      return;
    }

    viagens.forEach((v, i) => {
      const card = document.createElement("div");
      card.className = "card";
      card.style.cssText = `
        opacity: 0;
        transform: translateY(16px);
        transition: opacity 0.35s ease ${i * 80}ms, transform 0.35s ease ${i * 80}ms;
      `;

      // Badge de duração
      let duracao = "";
      if (v.data_ida && v.data_volta) {
        const dias = calcularDias(v.data_ida, v.data_volta);
        if (dias > 0) {
          duracao = `<span style="
            background:#b6d2c3;color:#3d7050;
            font-size:11px;font-weight:700;
            padding:2px 8px;border-radius:20px;
            margin-left:8px;vertical-align:middle;
          ">${dias} dias</span>`;
        }
      }

      card.innerHTML = `
        <h3 style="display:flex;align-items:center;flex-wrap:wrap;gap:4px">
          ${v.destino}${duracao}
        </h3>
        <p class="caracteristica-texto">
          <span class="label-info">Característica:</span>
          <span>${v.caracteristica}</span>
        </p>
        <p class="caracteristica-texto">
          <span class="label-info">Comprador:</span>
          <strong>${v.comprador || "Não informado"}</strong>
        </p>
        <p class="caracteristica-texto">
          <span class="label-info">Período:</span>
          <span>${fmtDataBR(v.data_ida)} até ${fmtDataBR(v.data_volta)}</span>
        </p>
      `;

      const acoesDiv = document.createElement("div");
      acoesDiv.className = "actions-viagens";

      if (CURRENT_ROLE === "adm") {
        acoesDiv.innerHTML = `
          <button class="btn-editar" onclick="abrirModalEdicao(${v.id})">Editar</button>
          <button class="btn-excluir" onclick="deletar(${v.id})">Excluir</button>
        `;
      } else if (CURRENT_ROLE === "user") {
        acoesDiv.innerHTML = `
          <button class="btn-excluir" style="width:100%" onclick="deletar(${v.id})">
            Cancelar minha viagem
          </button>
        `;
      }

      card.appendChild(acoesDiv);
      container.appendChild(card);

      // Animação de entrada escalonada
      requestAnimationFrame(() => requestAnimationFrame(() => {
        card.style.opacity = "1";
        card.style.transform = "translateY(0)";
      }));
    });

  } catch (error) {
    console.error("Erro ao carregar viagens:", error);
    const container = document.getElementById("listagem");
    if (container) {
      container.innerHTML = `
        <div style="width:100%;text-align:center;padding:40px;color:#6b7b73">
          <div style="font-size:40px;margin-bottom:12px">&#9888;&#65039;</div>
          <p>Não foi possível carregar as viagens.</p>
          <button onclick="carregarViagens()" style="
            margin-top:14px;background:#539466;color:#fff;
            border:none;padding:10px 24px;border-radius:8px;
            cursor:pointer;font-weight:700
          ">Tentar novamente</button>
        </div>
      `;
    }
    showToast("Erro ao carregar viagens. Verifique sua conexão.", "error");
  }
}

// Paginação
document.getElementById("btn_back")?.addEventListener("click", () => {
  paginaViagens++;
  carregarViagens();
});

document.getElementById("btn_load_more")?.addEventListener("click", () => {
  if (paginaViagens > 1) {
    paginaViagens--;
    carregarViagens();
  }
});

async function inserirViagem() {
  const destino = campoDestino.value.trim();
  const caracteristica = campoCaracteristica.value.trim();
  const comprador = campoComprador.value.trim();
  const data_ida = campoDataIda.value;
  const data_volta = campoDataVolta.value;

  if (!destino || !caracteristica || !comprador || !data_ida || !data_volta) {
    showToast("Preencha todos os campos antes de prosseguir.", "warning");
    return;
  }

  if (new Date(data_volta) < new Date(data_ida)) {
    showToast("A data de volta não pode ser anterior à data de ida.", "warning");
    return;
  }

  const btn = document.getElementById("btnSalvar");
  btn.textContent = "Salvando...";
  btn.disabled = true;

  try {
    const response = await fetch(`${API_BASE}/viagens`, {
      method: "POST",
      headers: headersAuth(),
      body: JSON.stringify({ destino, caracteristica, comprador, data_ida, data_volta }),
    });

    if (!response.ok) {
      const erro = await response.json();
      throw new Error(erro.error || "Erro ao inserir viagem.");
    }

    limparCampos();
    carregarViagens();
    showToast(`Viagem para ${destino} cadastrada com sucesso!`, "success");

  } catch (err) {
    console.error("Erro na insercao:", err);
    showToast("Erro ao salvar: " + err.message, "error");
  } finally {
    btn.textContent = "Salvar";
    btn.disabled = false;
  }
}

function limparCampos() {
  campoDestino.value = "";
  campoCaracteristica.value = "";
  campoComprador.value = "";
  campoDataIda.value = "";
  campoDataVolta.value = "";
}

let idParaDeletarGlobal = null;

function deletar(id) {
  idParaDeletarGlobal = id;
  const modal = document.getElementById("modalConfirmacao");
  if (modal) modal.style.display = "flex";
}

/* ========================
   EDICAO
======================== */

async function abrirModalEdicao(id) {
  try {
    const res = await fetch(`${API_BASE}/viagens/${id}`, { headers: headersAuth() });
    const v = await res.json();
    viagemEditandoId = id;

    campoDestino_edit.value = v.destino;
    campoCaracteristica_edit.value = v.caracteristica;
    campoComprador_edit.value = v.comprador;
    campoDataIda_edit.value = v.data_ida.slice(0, 10);
    campoDataVolta_edit.value = v.data_volta.slice(0, 10);

    document.getElementById("modal").style.display = "flex";
  } catch {
    showToast("Erro ao abrir a edição.", "error");
  }
}

async function salvarEdicao() {
  const btn = document.getElementById("btnSalvar_alteracao");
  btn.textContent = "Salvando...";
  btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/viagens/${viagemEditandoId}`, {
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

    if (res.ok) {
      showToast("Viagem atualizada com sucesso.", "success");
    } else {
      showToast("Erro ao atualizar viagem.", "error");
    }

    carregarViagens();
  } catch {
    showToast("Erro de conexão ao editar.", "error");
  } finally {
    btn.textContent = "Alterar";
    btn.disabled = false;
  }
}

/* ========================
   RECOMENDACOES
======================== */

let RECOMENDACOES_CACHE = [];
let dadosFiltradosCards = [];
let paginaCards = 1;
const limiteCards = 4;

async function carregarRecomendacoes() {
  try {
    const res = await fetch(`${API_BASE}/recomendacoes`, { headers: headersAuth() });
    const recos = await res.json();
    RECOMENDACOES_CACHE = recos;
    renderizarRecomendacoes(RECOMENDACOES_CACHE);
  } catch (error) {
    console.error("Erro ao carregar recomendacoes:", error);
    showToast("Erro ao carregar recomendações.", "error");
  }
}

function renderizarRecomendacoes(lista) {
  const container = document.getElementById("recoList");
  if (!container) return;

  dadosFiltradosCards = lista;
  container.innerHTML = "";

  if (lista.length === 0) {
    container.innerHTML = emptyStateRecomendacoes();
    return;
  }

  let itensParaExibir;
  if (window.innerWidth <= 425) {
    itensParaExibir = lista;
  } else {
    const inicio = (paginaCards - 1) * limiteCards;
    itensParaExibir = lista.slice(inicio, inicio + limiteCards);
  }

  itensParaExibir.forEach((r) => {
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
          <span>Ida:</span><div>${fmtDataBR(r.data_ida)}</div>
        </div>
        <div class="reco-line">
          <span>Volta:</span><div>${fmtDataBR(r.data_volta)}</div>
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

function aplicarFiltros() {
  paginaCards = 1;

  const inputDestino =
    document.getElementById("filtro-destino") ||
    document.getElementById("filtroNomeReco");
  const inputPreco =
    document.getElementById("filtro-preco") ||
    document.getElementById("filtroPrecoReco");

  const termo = inputDestino.value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  const precoMax = parseFloat(inputPreco.value) || Infinity;

  const filtrados = RECOMENDACOES_CACHE.filter((r) => {
    const destinoNorm = r.destino
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    return (
      destinoNorm.includes(termo) &&
      parseFloat(r.preco_passagem) <= precoMax
    );
  });

  renderizarRecomendacoes(filtrados);
}

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

function abrirModalReco(id, destino, preco, ida, volta) {
  recomendacaoSelecionada = id;
  recoDestinoTxt.textContent = destino;
  recoPrecoTxt.textContent = fmtBRL(preco);
  recoIdaTxt.textContent = ida.slice(0, 10);
  recoVoltaTxt.textContent = volta.slice(0, 10);

  const inputComprador = document.getElementById("recoComprador");
  if (inputComprador) {
    inputComprador.value = CURRENT_USER?.nome || "";
    inputComprador.readOnly = true;
  }

  document.getElementById("modalReco").style.display = "flex";
}

document.getElementById("btnFecharReco")?.addEventListener("click", () => {
  document.getElementById("modalReco").style.display = "none";
});

async function adicionarCarrinho() {
  const compradorInput = document.getElementById("recoComprador");
  const comprador = compradorInput ? compradorInput.value.trim() : "";

  if (!recomendacaoSelecionada) {
    showToast("Nenhuma recomendação selecionada.", "warning");
    return;
  }

  if (!comprador) {
    showToast("Preencha o nome do comprador.", "warning");
    return;
  }

  const btn = document.getElementById("btnComprarReco");
  btn.textContent = "Adicionando...";
  btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/carrinho/adicionar`, {
      method: "POST",
      headers: headersAuth(),
      body: JSON.stringify({
        recomendacao_id: Number(recomendacaoSelecionada),
        comprador,
      }),
    });

    if (res.ok) {
      document.getElementById("modalReco").style.display = "none";
      if (compradorInput) compradorInput.value = "";
      await atualizarContadorCarrinho();
      abrirCarrinho();
      showToast("Viagem adicionada ao carrinho!", "success");
    } else {
      const erroData = await res.json();
      showToast(`Erro: ${erroData.error || "Erro desconhecido"}`, "error");
    }
  } catch {
    showToast("Nao foi possivel conectar ao servidor.", "error");
  } finally {
    btn.textContent = "Adicionar";
    btn.disabled = false;
  }
}

document.getElementById("btnComprarReco")?.addEventListener("click", adicionarCarrinho);

/* ========================
   CARRINHO
======================== */

async function abrirCarrinho() {
  try {
    const res = await fetch(`${API_BASE}/carrinho`, { headers: headersAuth() });
    const itens = await res.json();
    const lista = document.getElementById("carrinhoLista");
    lista.innerHTML = "";

    if (itens.length === 0) {
      lista.innerHTML = `
        <div style="text-align:center;padding:40px 20px;color:#6b7b73">
          <div style="font-size:40px;margin-bottom:12px">&#128722;</div>
          <p style="font-size:0.9rem">Seu carrinho está vazio.</p>
          <p style="font-size:0.8rem;margin-top:6px;opacity:0.7">
            Explore as recomendações e adicione destinos!
          </p>
        </div>
      `;
      document.getElementById("cart-total").textContent = "R$ 0,00";
    } else {
      let total = 0;
      itens.forEach((item) => {
        total += Number(item.preco_passagem);
        const nomeExibicao =
          item.comprador || CURRENT_USER?.nome || "Viajante Anonimo";
        lista.innerHTML += `
          <div class="cart-item">
            <strong class="cart-item-destino">${item.destino}</strong>
            <p class="cart-price">${fmtBRL(item.preco_passagem)}</p>
            <p>${nomeExibicao}</p>
            <button class="btn-remover-carrinho" onclick="removerCarrinho(${item.id})">
              Remover
            </button>
          </div>
        `;
      });
      document.getElementById("cart-total").textContent =
        total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }

    document.getElementById("carrinhoOverlay").style.display = "flex";
  } catch {
    showToast("Erro ao carregar o carrinho.", "error");
  }
}

function fecharCarrinho() {
  document.getElementById("carrinhoOverlay").style.display = "none";
}

async function removerCarrinho(id) {
  try {
    await fetch(`${API_BASE}/carrinho/${id}`, {
      method: "DELETE",
      headers: headersAuth(),
    });
    showToast("Item removido do carrinho.", "info");
    abrirCarrinho();
    atualizarContadorCarrinho();
  } catch {
    showToast("Erro ao remover item.", "error");
  }
}

async function finalizarCompra() {
  const btn = document.getElementById("btnConfirmarCarrinho");
  btn.textContent = "Confirmando...";
  btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/carrinho/finalizar`, {
      method: "POST",
      headers: headersAuth(),
    });

    fecharCarrinho();
    atualizarContadorCarrinho();
    carregarViagens();

    if (res.ok) {
      showToast("Compra confirmada! Boas viagens!", "success", 5000);
    } else {
      showToast("Erro ao finalizar compra.", "error");
    }
  } catch {
    showToast("Erro de conexao ao finalizar.", "error");
  } finally {
    btn.textContent = "Confirmar todas";
    btn.disabled = false;
  }
}

async function atualizarContadorCarrinho() {
  try {
    const res = await fetch(`${API_BASE}/carrinho`, { headers: headersAuth() });
    const itens = await res.json();
    document.getElementById("contador-carrinho").textContent = itens.length;
  } catch {
    // silencioso
  }
}

/* ========================
   LOGOUT
======================== */

function logout() {
  localStorage.removeItem("token");
  window.location.href = "auth.html";
}

/* ========================
   USUARIOS (ADMIN)
======================== */

let paginaUsuarios = 1;
const limiteUsuarios = 20;

async function carregarUsuarios() {
  try {
    const res = await fetch(
      `${API_BASE}/users?page=${paginaUsuarios}&limit=${limiteUsuarios}`,
      { headers: headersAuth() }
    );
    const data = await res.json();

    if (data.usuarios && Array.isArray(data.usuarios)) {
      renderizarTabelaUsuarios(data.usuarios);
      document.getElementById("infoPaginaUsuarios").textContent =
        `Página ${paginaUsuarios}`;
    }
  } catch (err) {
    console.error("Erro ao carregar usuarios:", err);
  }
}

function renderizarTabelaUsuarios(usuarios) {
  const tbody = document.getElementById("listaUsuariosBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (usuarios.length === 0) {
    tbody.innerHTML =
      "<tr><td colspan='5' style='text-align:center;padding:20px'>Nenhum usuário encontrado.</td></tr>";
    return;
  }

  usuarios.forEach((user) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${user.id}</td>
      <td class="user-nome-destaque">${user.nome || "Sem nome"}</td>
      <td>${user.email || "---"}</td>
      <td><span class="label">${(user.role || "user").toUpperCase()}</span></td>
      <td>
        <button class="btn-user-excluir" onclick="deletarUsuario(${user.id})">
          Remover
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function gerenciarVisualizacaoAdmin() {
  const painel =
    document.getElementById("painelGerenciarUsuarios") ||
    document.getElementById("painelAdminUsuarios");

  if (!painel) return;

  if (CURRENT_ROLE === "adm") {
    painel.style.display = "block";
    carregarUsuarios();
  } else {
    painel.style.display = "none";
    const tbody = document.getElementById("listaUsuariosBody");
    if (tbody) tbody.innerHTML = "";
  }
}

async function deletarUsuario(id) {
  if (!confirm(`Tem certeza que deseja remover o usuário ID ${id}?`)) return;

  try {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: "DELETE",
      headers: headersAuth(),
    });

    if (res.ok) {
      showToast("Usuário removido com sucesso.", "success");
      carregarUsuarios();
    } else {
      const erro = await res.json();
      showToast(`Erro: ${erro.error || "Nao autorizado"}`, "error");
    }
  } catch {
    showToast("Erro de conexao ao remover usuario.", "error");
  }
}

// Paginacao de usuarios
document.getElementById("btnAnteriorUsuarios").onclick = () => {
  if (paginaUsuarios > 1) {
    paginaUsuarios--;
    carregarUsuarios();
  }
};

document.getElementById("btnProximoUsuarios").onclick = () => {
  paginaUsuarios++;
  carregarUsuarios();
};