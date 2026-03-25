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

    // --- NOVA LÓGICA DE AVATAR E DROPDOWN ---
    // Gera as iniciais (ex: "João Silva" vira "JS")
    const nomes = user.nome.split(' ');
    const iniciais = (nomes[0][0] + (nomes[1] ? nomes[1][0] : '')).toUpperCase();

    document.getElementById("userAvatar").textContent = iniciais;
    document.getElementById("userName").textContent = user.nome;
    document.getElementById("userRoleText").textContent = user.role.toUpperCase();

    // Lógica de toggle do menu dropdown
    const profile = document.getElementById("userProfile");
    profile.addEventListener("click", (e) => {
      e.stopPropagation(); // Evita que o clique feche o menu imediatamente
      profile.classList.toggle("active");
    });

    // Fecha ao clicar fora
    window.addEventListener("click", () => {
      profile.classList.remove("active");
    });
    // ----------------------------------------

    configurarInterface();
    registrarEventos();
    carregarViagens();
    carregarUsuarios();
    gerenciarVisualizacaoAdmin();

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

  document.getElementById("btnLogoutDropdown")?.addEventListener("click", logout);


  document.getElementById("btnConfirmarExclusao")?.addEventListener("click", async () => {
    if (idParaDeletarGlobal) {
      // Aqui entra o seu código original de exclusão
      await fetch(`${API_BASE}/viagens/${idParaDeletarGlobal}`, {
        method: "DELETE",
        headers: headersAuth(),
      });

      // Fecha o modal e limpa tudo
      document.getElementById("modalConfirmacao").style.display = "none";
      idParaDeletarGlobal = null;

      // Atualiza a lista na tela
      carregarViagens();
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
      // Removido o margin-left fixo para permitir a centralização flexível
      container.innerHTML = "<p class='msg-vazia'>Fim dos registros ou nenhuma viagem encontrada.</p>"; return;
    }

    // 6. Renderização dos Cards
    viagens.forEach((v) => {
      const card = document.createElement("div");
      card.className = "card";

      // Conteúdo com labels informativos
      card.innerHTML = `
    <h3>${v.destino}</h3>
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
        <span>${v.data_ida?.slice(0, 10)} até ${v.data_volta?.slice(0, 10)}</span>
    </p>
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
          <button class="btn-excluir" style="width: 100%" onclick="deletar(${v.id})">Cancelar minha viagem</button>
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
  const destino = campoDestino.value.trim();
  const caracteristica = campoCaracteristica.value.trim();
  const comprador = campoComprador.value.trim();
  const data_ida = campoDataIda.value;
  const data_volta = campoDataVolta.value;

  if (!destino || !caracteristica || !comprador || !data_ida || !data_volta) {
    alert('Preencha todos os campos antes de prosseguir!')
    return
  }

  if (new Date(data_volta) < new Date(data_ida)) {
    alert('A data de volta não pode ser anterior a data de ida!')
    return
  }

  const body = {
    destino,
    caracteristica,
    comprador,
    data_ida,
    data_volta,
  }

  try {
    const response = await fetch(`${API_BASE}/viagens`, {
      method: 'POST',
      headers: headersAuth(),
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const erro = await response.json()
      throw new Error(erro.error || 'Erro ao inserir viagem!')
    }

    limparCampos()
    carregarViagens()
    alert('Viagem cadastrada com sucesso!')

  } catch (err) {
    console.error('Erro na inserção', err)
    alert('Erro ao salvar!' + err.message)
  }
};

function limparCampos() {
  campoDestino.value = "";
  campoCaracteristica.value = "";
  campoComprador.value = "";
  campoDataIda.value = "";
  campoDataVolta.value = "";
}

// Variável para guardar o ID temporariamente
let idParaDeletarGlobal = null;

async function deletar(id) {
  // Guarda o ID para saber quem excluir depois
  idParaDeletarGlobal = id;

  // Mostra o modal (certifique-se de que o ID no HTML seja 'modalConfirmacao')
  const modal = document.getElementById("modalConfirmacao");
  if (modal) {
    modal.style.display = "flex";
  }
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
  container.innerHTML = "";

  // 1. Verificação de lista vazia
  if (lista.length === 0) {
    container.innerHTML = `
            <div style="width:100%; text-align:center; padding: 20px;">
                Nenhum destino encontrado com esses filtros.
            </div>`;
    return;
  }

  // 2. Lógica de exibição Híbrida:
  let itensParaExibir;

  if (window.innerWidth <= 425) {
    // No Mobile, mostramos todos para que o CSS (overflow-x: auto) permita o scroll lateral
    itensParaExibir = lista;
  } else {
    // No Desktop/Tablet, mantemos a paginação de 4 em 4
    const inicio = (paginaCards - 1) * limiteCards;
    const fim = inicio + limiteCards;
    itensParaExibir = lista.slice(inicio, fim);
  }

  // 3. Renderização dos cards
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
      // Evita abrir o modal se o usuário clicar apenas no link do mapa
      if (e.target.tagName === "A") return;
      abrirModalReco(r.id, r.destino, r.preco_passagem, r.data_ida, r.data_volta);
    });

    container.appendChild(card);
  });
}

// 4. Lógica de Filtros (Resetando a página para 1)

function aplicarFiltros() {
  paginaCards = 1; // Reseta para a primeira página ao filtrar

  // Captura os valores dos inputs (ajuste os IDs se necessário conforme seu HTML)
  const inputDestino = document.getElementById("filtro-destino") || document.getElementById("filtroNomeReco");
  const inputPreco = document.getElementById("filtro-preco") || document.getElementById("filtroPrecoReco");

  // Normaliza o termo de busca (remove acentos e espaços)
  const termo = inputDestino.value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  const precoMax = parseFloat(inputPreco.value) || Infinity;

  const filtrados = RECOMENDACOES_CACHE.filter(r => {
    // Normaliza o destino do banco de dados para comparar
    const destinoNormalizado = r.destino
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const matchNome = destinoNormalizado.includes(termo);
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

  const inputComprador = document.getElementById("recoComprador");
  if (inputComprador) {
    inputComprador.value = CURRENT_USER?.nome || "";
    inputComprador.readOnly = true;
  }

  document.getElementById("modalReco").style.display = "flex";
}

// Fechar modal de recomendação
document.getElementById("btnFecharReco")?.addEventListener("click", () => {
  document.getElementById("modalReco").style.display = "none";
});

async function adicionarCarrinho() {
  // 1. Captura o valor do input (que deve ser preenchido no abrirModalReco)
  const compradorInput = document.getElementById("recoComprador");
  const comprador = compradorInput ? compradorInput.value.trim() : "";

  // 2. Validação básica
  if (!recomendacaoSelecionada) {
    alert("Nenhuma recomendação selecionada.");
    return;
  }

  if (!comprador) {
    alert("Por favor, preencha o nome do comprador.");
    return;
  }

  try {
    // 3. Faz a requisição para o servidor
    const res = await fetch(`${API_BASE}/carrinho/adicionar`, {
      method: "POST",
      headers: headersAuth(),
      body: JSON.stringify({
        recomendacao_id: Number(recomendacaoSelecionada),
        comprador: comprador
      }),
    });

    // 4. Se o servidor responder com sucesso (status 200-299)
    if (res.ok) {
      // Fecha o modal de detalhes
      document.getElementById("modalReco").style.display = "none";

      // Limpa o campo para a próxima vez
      if (compradorInput) compradorInput.value = "";

      // Atualiza o número no ícone do carrinho
      await atualizarContadorCarrinho();

      // Abre o painel lateral do carrinho automaticamente
      abrirCarrinho();

    } else {
      const erroData = await res.json();
      alert(`Erro ao adicionar: ${erroData.error || "Erro desconhecido"}`);
    }
  } catch (err) {
    console.error("Erro na requisição do carrinho:", err);
    alert("Não foi possível conectar ao servidor.");
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
    const nomeExibicao = item.comprador || CURRENT_USER?.nome || 'Viajante Anônimo';

    lista.innerHTML += `
      <div class="cart-item">
        <strong class="cart-item-destino">${item.destino}</strong>
        <p>R$ ${item.preco_passagem}</p>
        <p id="cart-item-comprador">${nomeExibicao}</p>
        <button class=btn-remover-carrinho onclick="removerCarrinho(${item.id})">Remover</button>
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
  console.log("Logout disparado!"); // Isso aparecerá no Console (F12)

  localStorage.removeItem("token");

  // Redirecionamento forçado
  window.location.href = "auth.html";
}

let paginaUsuarios = 1;
const limiteUsuarios = 20;

async function carregarUsuarios() {
  try {
    const res = await fetch(`${API_BASE}/users?page=${paginaUsuarios}&limit=${limiteUsuarios}`, {
      headers: headersAuth()
    });

    const data = await res.json();
    console.log("Dados recebidos do banco:", data); // <--- ADICIONE ISSO

    if (data.usuarios && Array.isArray(data.usuarios)) {
      renderizarTabelaUsuarios(data.usuarios);
      document.getElementById("infoPaginaUsuarios").textContent = `Página ${paginaUsuarios}`;
    } else {
      console.warn("A chave 'usuarios' não foi encontrada ou não é uma lista", data);
    }
  } catch (err) {
    console.error("Erro ao carregar usuários:", err);
  }
}



function renderizarTabelaUsuarios(usuarios) {
  const tbody = document.getElementById("listaUsuariosBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (usuarios.length === 0) {
    tbody.innerHTML = "<tr><td colspan='5' style='text-align:center'>Nenhum usuário encontrado.</td></tr>";
    return;
  }

  usuarios.forEach(user => {
    const tr = document.createElement("tr");

    // Verificamos os nomes exatos que vem do seu SELECT no back-end
    const nome = user.nome || "Sem nome";
    const email = user.email || "---"; // Se não houver email no select, virá ---
    const cargo = user.role || "user";
    const status = user.ativo ? "Ativo" : "Inativo";

    tr.innerHTML = `
            <td>${user.id}</td>
            <td class="user-nome-destaque">${nome}</td>
            <td>${email}</td>
            <td><span class="label">${cargo.toUpperCase()}</span></td>
            <td>
                <button class="btn-user-excluir" onclick="deletarUsuario(${user.id})">Remover</button>
            </td>
        `;
    tbody.appendChild(tr);
  });
}

// Substitua as duas funções de verificação por esta única:
function gerenciarVisualizacaoAdmin() {
  // Tenta encontrar o painel por qualquer um dos IDs que você usou
  const painel = document.getElementById("painelGerenciarUsuarios") ||
    document.getElementById("painelAdminUsuarios");

  if (!painel) return;

  if (CURRENT_ROLE === 'adm') {
    painel.style.display = "block";
    carregarUsuarios(); // Só busca do banco se for admin
  } else {
    painel.style.display = "none";
    // Limpamos a tabela para não sobrar rastros de dados se o role mudar
    const tbody = document.getElementById("listaUsuariosBody");
    if (tbody) tbody.innerHTML = "";
  }
}

// CHAME ESTA FUNÇÃO:
// 1. Dentro da sua função de inicialização (DOMContentLoaded)
// 2. Logo após o sucesso do login

async function deletarUsuario(id) {
  // 1. Confirmação de segurança
  if (!confirm(`Tem certeza que deseja remover o usuário ID ${id}?`)) {
    return;
  }

  try {
    // 2. Requisição DELETE para o servidor (usando /users conforme seu server.js)
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: "DELETE",
      headers: headersAuth()
    });

    if (res.ok) {
      alert("Usuário removido com sucesso!");
      // 3. Recarrega a tabela para atualizar a lista
      carregarUsuarios();
    } else {
      const erro = await res.json();
      alert(`Erro ao excluir: ${erro.error || "Não autorizado"}`);
    }
  } catch (err) {
    console.error("Erro ao deletar usuário:", err);
    alert("Erro de conexão ao tentar excluir o usuário.");
  }
}

// Eventos de Paginação
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

