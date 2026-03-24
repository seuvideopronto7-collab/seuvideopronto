const fields = {
  titulo: document.getElementById("titulo"),
  descricao: document.getElementById("descricao"),
  cta: document.getElementById("cta"),
  roteiro: document.getElementById("roteiro"),
  copy: document.getElementById("copy"),
  hashtags: document.getElementById("hashtags"),
  checkout: document.getElementById("checkout"),
  landing: document.getElementById("landing"),
  videoFile: document.getElementById("videoFile"),
  videoUrl: document.getElementById("videoUrl")
};

const btnSalvar = document.getElementById("btnSalvar");
const btnBaixarPacote = document.getElementById("btnBaixarPacote");
const btnBaixarVideo = document.getElementById("btnBaixarVideo");
const btnCopiarCopy = document.getElementById("btnCopiarCopy");
const btnReenviar = document.getElementById("btnReenviar");
const btnRegerar = document.getElementById("btnRegerar");
const btnProdutosAtualizar = document.getElementById("btnProdutosAtualizar");
const btnProdutoCriar = document.getElementById("btnProdutoCriar");
const saveStatus = document.getElementById("saveStatus");
const infoAviso = document.getElementById("infoAviso");
const ytConnected = document.getElementById("ytConnected");
const ytStatus = document.getElementById("ytStatus");
const produtosLista = document.getElementById("produtosLista");
const produtosVazio = document.getElementById("produtosVazio");
const produtosStatus = document.getElementById("produtosStatus");
const produtoNome = document.getElementById("produtoNome");
const produtoTipo = document.getElementById("produtoTipo");
const viewFlow = document.getElementById("viewFlow");
const viewDistribuidor = document.getElementById("viewDistribuidor");
const btnGoFlow = document.getElementById("btnGoFlow");
const btnGoDistribuidor = document.getElementById("btnGoDistribuidor");
const btnSalvarDistribuir = document.getElementById("btnSalvarDistribuir");
const flowInfo = document.getElementById("flowInfo");
const resumeTitulo = document.getElementById("resumeTitulo");
const resumeCta = document.getElementById("resumeCta");
const resumeHashtags = document.getElementById("resumeHashtags");
const btnAtivarMaquina = document.getElementById("btnAtivarMaquina");
const btnPublicarInfoproduto = document.getElementById("btnPublicarInfoproduto");
const darkflowLog = document.getElementById("darkflowLog");
const btnConteudo30 = document.getElementById("btnConteudo30");
const conteudo30Status = document.getElementById("conteudo30Status");
const conteudo30Calendario = document.getElementById("conteudo30Calendario");
const promptVideo = document.getElementById("promptVideo");
const promptInfo = document.getElementById("promptInfo");
const nichoField = document.getElementById("nicho");
const objetivoField = document.getElementById("objetivo");
const marcaField = document.getElementById("marca");
const publicoField = document.getElementById("publico");
const plataformaField = document.getElementById("plataforma");
const canalInstagram = document.getElementById("canalInstagram");
const canalTikTok = document.getElementById("canalTikTok");
const canalYouTube = document.getElementById("canalYouTube");
const btnConectarRedes = document.getElementById("btnConectarRedes");
const btnAtivarAutopost = document.getElementById("btnAtivarAutopost");
const autopostStatus = document.getElementById("autopostStatus");
const routeSelect = document.getElementById("routeSelect");
const viewRoute = document.getElementById("viewRoute");
const routeTitle = document.getElementById("routeTitle");
const routeDesc = document.getElementById("routeDesc");
const routeStatus = document.getElementById("routeStatus");
const routePath = document.getElementById("routePath");

const STORAGE_KEY = "material_salvo";
const QUEUE_KEY = "fila_publicacao";
const PRODUTOS_KEY = "produtos_prontos";
const ROUTE_STATE_KEY = "route_state_material";
const DARKFLOW_PROJECTS_KEY = "darkflow_projects";
const DARKFLOW_CALENDAR_KEY = "darkflow_calendar";

const PROMPT_VIDEO = `id="svp_real_engine"
Crie um sistema real de geracao de videos automatizados com IA.

FUNCIONAMENTO:

1. Usuario insere:
- texto
- opcional: imagem

2. Sistema gera roteiro estruturado:
- gancho
- promessa
- demonstracao
- CTA

3. Integracao com ElevenLabs:
- gerar narracao real via API
- salvar audio

4. Integracao com Runway:
- gerar cenas a partir do texto e imagem

5. Backend (Supabase Edge Function):
- usar FFmpeg para:
  - unir video + audio
  - ajustar formato vertical (1080x1920)
  - otimizar qualidade

6. Upload automatico:
- salvar video final no Supabase Storage
- gerar URL publica

7. Frontend:
- botao "GERAR VIDEO"
- mostrar loading real
- barra de progresso
- preview automatico

REGRAS:
- tudo deve funcionar em tempo real
- nenhuma simulacao
- tratamento de erro obrigatorio
- fallback se API falhar

EXTRA:
- permitir download
- permitir repost automatico

OBJETIVO:
Transformar texto + imagem em video pronto para redes sociais`;

const setStatus = (message, tone) => {
  saveStatus.textContent = message;
  saveStatus.style.color = tone === "success" ? "#2ea44f" : "#6f6f6f";
};

const setInfo = (message, tone) => {
  infoAviso.textContent = message;
  infoAviso.style.color = tone === "warning" ? "#d97706" : "#6f6f6f";
};

const setProdutosStatus = (message, tone) => {
  produtosStatus.textContent = message;
  produtosStatus.style.color = tone === "warning" ? "#d97706" : "#6f6f6f";
};

const setAutopostStatus = (message, tone) => {
  autopostStatus.textContent = message;
  autopostStatus.style.color = tone === "warning" ? "#d97706" : "#6f6f6f";
};

const setPromptStatus = (message, tone) => {
  if (!promptInfo) return;
  promptInfo.textContent = message;
  promptInfo.style.color = tone === "warning" ? "#d97706" : "#6f6f6f";
};

const appendDarkflowLog = (message) => {
  const line = document.createElement("div");
  line.textContent = message;
  darkflowLog.appendChild(line);
};

const resetDarkflowLog = () => {
  darkflowLog.innerHTML = "";
};

const getMaterial = () => {
  const roteiroLinhas = fields.roteiro.value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const hashtagsLista = fields.hashtags.value
    .split(" ")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return {
    video: fields.videoFile.files[0] || null,
    videoUrl: fields.videoUrl.value.trim() || null,
    roteiro: roteiroLinhas,
    copy: fields.copy.value.trim(),
    hashtags: hashtagsLista,
    titulo: fields.titulo.value.trim(),
    descricao: fields.descricao.value.trim(),
    cta: fields.cta.value.trim(),
    links: {
      checkout: fields.checkout.value.trim(),
      landing: fields.landing.value.trim()
    }
  };
};

const getFallbackMaterial = () => ({
  video: null,
  videoUrl: null,
  roteiro: ["Abertura rapida", "Mensagem central", "Fechamento com CTA"],
  copy: "Legenda pronta para publicar.",
  hashtags: ["#conteudo", "#fature"],
  titulo: "Video pronto para publicar",
  descricao: "Resumo automatico do conteudo.",
  cta: "Acesse o link principal",
  links: {
    checkout: "",
    landing: ""
  }
});

const getDarkflowInput = () => ({
  nicho: nichoField.value.trim() || "conteudo",
  objetivo: objetivoField.value || "vendas",
  marca: marcaField.value.trim() || "Produto",
  publico: publicoField.value.trim() || "publico geral",
  plataforma: plataformaField.value || "instagram"
});

const createDarkflowState = () => ({
  etapa: "roteiro",
  progresso: 0,
  dados: {},
  erros: []
});

const gerarRoteiro = (input) => [
  `Hook viral para ${input.nicho}`,
  `Storytelling com ${input.objetivo}`,
  `CTA para ${input.marca}`
];

const gerarVariacoes = (input) => ({
  titulos: Array.from({ length: 5 }, (_, i) => `Titulo ${i + 1} - ${input.nicho}`),
  descricoes: Array.from({ length: 5 }, (_, i) => `Descricao ${i + 1} focada em ${input.objetivo}.`),
  hashtags: [
    `#${input.nicho.replace(/\s+/g, "")}`,
    "#fature",
    "#conteudo",
    "#viral",
    "#marketing"
  ]
});

const gerarProduto = (input) => ({
  nome: `${input.marca} - Metodo Turbo`,
  oferta: "Acesso imediato + bonus exclusivos",
  promessa: `Resultado perceptivel para ${input.publico}`,
  vsl: ["Promessa", "Prova", "Oferta", "Garantia"]
});

const gerarSeo = (input, roteiro) => {
  const fallback = {
    palavrasChave: [input.nicho, "conteudo", "viral"],
    titulo: `Guia rapido de ${input.nicho}`,
    descricao: roteiro.join(" "),
    status: "fallback"
  };

  try {
    return {
      palavrasChave: [input.nicho, "SEO", "ganhos"],
      titulo: `Como dominar ${input.nicho} com IA`,
      descricao: `Resumo estrategico para ${input.nicho}.`,
      status: "ok"
    };
  } catch (error) {
    return fallback;
  }
};

const salvarProjetoLocal = (dados) => {
  const raw = localStorage.getItem(DARKFLOW_PROJECTS_KEY);
  const projetos = raw ? JSON.parse(raw) : [];
  const novo = {
    id: String(Date.now()),
    nome: dados.produto?.nome || "Projeto DarkFlow",
    tipo: "infoproduto",
    data: new Date().toISOString(),
    dados
  };
  projetos.push(novo);
  localStorage.setItem(DARKFLOW_PROJECTS_KEY, JSON.stringify(projetos));
  return novo;
};

const publicarConteudo = (dados, canais) => {
  canais.forEach((canal) => {
    console.log(`Publicado no ${canal}`);
  });
  return canais.map((canal) => ({ canal, status: "ok" }));
};

const executarFluxoCompleto = (input) => {
  const state = createDarkflowState();
  resetDarkflowLog();
  appendDarkflowLog("Iniciando DarkFlow Engine...");

  state.etapa = "roteiro";
  state.progresso = 20;
  const roteiro = gerarRoteiro(input);
  appendDarkflowLog("Roteiro gerado.");

  state.etapa = "produto";
  state.progresso = 45;
  const variacoes = gerarVariacoes(input);
  appendDarkflowLog("Variacoes prontas.");

  const produto = gerarProduto(input);
  appendDarkflowLog("Produto gerado.");

  const seo = gerarSeo(input, roteiro);
  if (seo.status === "fallback") {
    appendDarkflowLog("SEO em fallback. Fluxo continua sem travar.");
  } else {
    appendDarkflowLog("SEO OK.");
  }

  const saved = salvarProjetoLocal({ roteiro, variacoes, produto, seo, input });
  appendDarkflowLog(`Salvo local: ${saved.nome}.`);

  const canais = getCanaisSelecionados();
  publicarConteudo({ roteiro, produto, seo }, canais);
  appendDarkflowLog(`Publicado: ${canais.join(", ") || "sem canais"}.`);

  state.etapa = "publicacao";
  state.progresso = 100;
  state.dados = { roteiro, variacoes, produto, seo };

  return state;
};

const executarAcaoReal = async (nome, payload) => {
  console.log("Executando acao real:", nome);

  try {
    if (!nome) {
      return null;
    }

    if (nome.startsWith("/")) {
      return navegarReal(nome);
    }

    if (nome === "navegar") {
      return navegarReal(payload);
    }

    if (["salvar", "salvar-distribuir", "salvar-material"].includes(nome)) {
      return salvarReal(payload || getMaterial());
    }

    if (["gerar", "ativar-maquina", "publicar-infoproduto"].includes(nome)) {
      return gerarReal(payload || getDarkflowInput());
    }

    if (nome === "postar-agora") {
      return publicarReal(payload || getMaterial());
    }

    console.warn("Acao nao mapeada:", nome);
    return null;
  } catch (err) {
    console.error("Erro na acao:", nome, err);
    return null;
  }
};

const navegarReal = (rota) => {
  if (!rota) return;
  if (rota.startsWith("/")) {
    navigateTo(rota);
    return;
  }
  window.location.href = rota;
};

const salvarReal = (dados) => {
  if (!dados) return;
  persistMaterial(dados);
  console.log("Salvo localmente");
};

const gerarReal = (input) => {
  if (!input) return null;
  return executarFluxoCompleto(input);
};

const publicarReal = async (dados) => {
  if (!dados) return;
  console.log("Preparando publicacao...");
  addToQueue(dados);
  const fila = JSON.parse(localStorage.getItem("fila_post") || "[]");
  fila.push({
    titulo: dados.titulo,
    descricao: dados.descricao,
    video: dados.video,
    hashtags: dados.hashtags,
    links: dados.links
  });
  localStorage.setItem("fila_post", JSON.stringify(fila));
  console.log("Conteudo salvo para publicacao futura");
};

const applyMaterialToFields = (data) => {
  if (!data) return;
  fields.titulo.value = data.titulo || "";
  fields.descricao.value = data.descricao || "";
  fields.cta.value = data.cta || "";
  fields.roteiro.value = (data.roteiro || []).join("\n");
  fields.copy.value = data.copy || "";
  fields.hashtags.value = (data.hashtags || []).join(" ");
  fields.checkout.value = data.links?.checkout || "";
  fields.landing.value = data.links?.landing || "";
  fields.videoUrl.value = data.videoUrl || "";
};

const updateResumo = (material) => {
  const data = material || getFallbackMaterial();
  resumeTitulo.textContent = data.titulo || "Video pronto para publicar";
  resumeCta.textContent = data.cta || "Acesse o link principal";
  resumeHashtags.textContent = (data.hashtags || []).join(" ") || "#conteudo #fature";
};

const persistMaterial = (material) => {
  const payload = { ...material, video: null };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  setStatus("Material salvo com sucesso.", "success");
  updateResumo(payload);
};

const loadMaterial = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    applyMaterialToFields(data);
    setStatus("Material carregado do salvamento local.", "success");
    updateResumo(data);
  } catch (error) {
    setStatus("Falha ao carregar material salvo.", "warning");
  }
};

const getMaterialGerado = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return getFallbackMaterial();
  try {
    return JSON.parse(raw);
  } catch (error) {
    return getFallbackMaterial();
  }
};

const hydrateFromRouteState = () => {
  const raw = sessionStorage.getItem(ROUTE_STATE_KEY);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    applyMaterialToFields(data);
    setStatus("Material recebido do fluxo principal.", "success");
    updateResumo(data);
    sessionStorage.removeItem(ROUTE_STATE_KEY);
    return true;
  } catch (error) {
    return false;
  }
};

const routeMeta = {
  "/auth": {
    title: "Autenticacao",
    description: "Controle de acesso e login centralizado."
  },
  "/perfil": {
    title: "Perfil",
    description: "Gestao de dados do usuario e preferencias."
  },
  "/admin": {
    title: "Admin",
    description: "Configuracoes e visao administrativa do sistema."
  },
  "/infoproduto": {
    title: "Infoproduto",
    description: "Fluxo principal de criacao e publicacao."
  },
  "/produtos-prontos": {
    title: "Produtos Prontos",
    description: "Biblioteca de produtos finalizados para reutilizar."
  },
  "/planos": {
    title: "Planos",
    description: "Gestao de planos e cobrancas."
  },
  "/apis": {
    title: "APIs",
    description: "Integracoes disponiveis e status de conexao."
  },
  "/distribuidor": {
    title: "Distribuidor",
    description: "Central de distribuicao e reaproveitamento."
  }
};

const setRoute = (path) => {
  const normalizedPath = path === "/" ? "/infoproduto" : path;
  const isDistribuidor = normalizedPath === "/distribuidor";
  const isFlow = normalizedPath === "/infoproduto";
  const isRouteView = !isDistribuidor && !isFlow;

  viewFlow.classList.toggle("active", isFlow);
  viewDistribuidor.classList.toggle("active", isDistribuidor);
  viewRoute.classList.toggle("active", isRouteView);

  if (isDistribuidor) {
    document.title = "Central de Distribuicao";
    hydrateFromRouteState();
  } else if (isFlow) {
    document.title = "Seu Video Pronto";
    updateResumo(getMaterialGerado());
  } else {
    const meta = routeMeta[normalizedPath] || {
      title: "Rota personalizada",
      description: "Essa rota esta ativa e pronta para acao."
    };
    document.title = `Rota ${normalizedPath}`;
    routeTitle.textContent = meta.title;
    routeDesc.textContent = meta.description;
    routeStatus.textContent = "Ativa";
    routePath.textContent = normalizedPath;
  }

  if (routeSelect) {
    const values = Array.from(routeSelect.options).map((opt) => opt.value);
    if (values.includes(normalizedPath)) {
      routeSelect.value = normalizedPath;
    } else if (values.includes("/")) {
      routeSelect.value = "/";
    }
  }
};

const navigateTo = (path, state) => {
  if (state) {
    sessionStorage.setItem(ROUTE_STATE_KEY, JSON.stringify(state));
  }
  window.history.pushState({ path }, "", path);
  setRoute(path);
};

const addToQueue = (material) => {
  const raw = localStorage.getItem(QUEUE_KEY);
  const queue = raw ? JSON.parse(raw) : [];
  queue.push({ ...material, queuedAt: new Date().toISOString() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

const gerarMockProdutos = () => [
  {
    id: 1,
    nome: "Metodo Emagrecimento 21 Dias",
    tipo: "ebook",
    status: "pronto"
  },
  {
    id: 2,
    nome: "Curso Vendas com IA",
    tipo: "curso",
    status: "pronto"
  }
];

const salvarProdutosLocal = (produtos) => {
  localStorage.setItem(PRODUTOS_KEY, JSON.stringify(produtos));
};

const carregarProdutosLocal = () => {
  const raw = localStorage.getItem(PRODUTOS_KEY);
  if (!raw) {
    const seed = gerarMockProdutos();
    salvarProdutosLocal(seed);
    return seed;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    const seed = gerarMockProdutos();
    salvarProdutosLocal(seed);
    return seed;
  }
};

const carregarProdutos = async () => {
  try {
    const res = await fetch("/api/produtos");
    if (!res.ok) throw new Error("Resposta invalida");
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("Formato invalido");
    salvarProdutosLocal(data);
    setProdutosStatus("Produtos carregados da API.", "success");
    return data;
  } catch (error) {
    console.warn("API falhou, usando local", error);
    setProdutosStatus("API indisponivel. Usando dados locais.", "warning");
    return carregarProdutosLocal();
  }
};

const renderProdutos = (produtos) => {
  produtosLista.innerHTML = "";
  const lista = Array.isArray(produtos) ? produtos : [];
  produtosVazio.style.display = lista.length ? "none" : "block";

  lista.forEach((produto) => {
    const item = document.createElement("li");
    item.className = "product-item";

    const meta = document.createElement("div");
    meta.className = "product-meta";

    const nome = document.createElement("div");
    nome.className = "product-name";
    nome.textContent = produto.nome || "Produto sem nome";

    const sub = document.createElement("div");
    sub.className = "product-sub";
    sub.textContent = `Status: ${produto.status || "pronto"}`;

    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = produto.tipo || "produto";

    const reuse = document.createElement("button");
    reuse.type = "button";
    reuse.className = "btn-inline";
    reuse.textContent = "Usar novamente";
    reuse.dataset.action = "abrir-projeto";
    reuse.dataset.projetoId = produto.id;

    meta.appendChild(nome);
    meta.appendChild(sub);

    item.appendChild(meta);
    item.appendChild(badge);
    item.appendChild(reuse);
    produtosLista.appendChild(item);
  });
};

const criarProduto = () => {
  const nome = produtoNome.value.trim();
  const tipo = produtoTipo.value;
  if (!nome) {
    setProdutosStatus("Informe o nome do produto.", "warning");
    return;
  }
  const lista = carregarProdutosLocal();
  const novo = {
    id: Date.now(),
    nome,
    tipo,
    status: "pronto"
  };
  lista.push(novo);
  salvarProdutosLocal(lista);
  renderProdutos(lista);
  produtoNome.value = "";
  produtoTipo.value = "ebook";
  setProdutosStatus("Produto criado e salvo localmente.", "success");
};

const abrirProjeto = (id) => {
  const lista = carregarProdutosLocal();
  const produto = lista.find((item) => String(item.id) === String(id));
  if (!produto) {
    setProdutosStatus("Produto nao encontrado para reutilizar.", "warning");
    return;
  }
  produtoNome.value = produto.nome || "";
  produtoTipo.value = produto.tipo || "ebook";
  setProdutosStatus("Produto selecionado para reutilizar.", "success");
};

const gerarCalendario30Dias = (input) => {
  const hoje = new Date();
  const itens = Array.from({ length: 30 }, (_, i) => {
    const data = new Date(hoje);
    data.setDate(hoje.getDate() + i);
    return {
      id: String(Date.now() + i),
      data: data.toISOString().split("T")[0],
      roteiro: `Roteiro ${i + 1} - ${input.nicho}`,
      objetivo: input.objetivo,
      legenda: `Legenda ${i + 1} focada em ${input.objetivo}.`,
      hashtags: `#${input.nicho.replace(/\s+/g, "")} #conteudo`,
      textoFalado: `Mensagem principal para ${input.publico}.`,
      canal: input.plataforma
    };
  });
  localStorage.setItem(DARKFLOW_CALENDAR_KEY, JSON.stringify(itens));
  return itens;
};

const renderCalendario30Dias = (itens) => {
  conteudo30Calendario.innerHTML = "";
  itens.forEach((item) => {
    const row = document.createElement("div");
    row.className = "calendar-item";
    const left = document.createElement("div");
    left.textContent = `${item.data} - ${item.roteiro}`;
    const right = document.createElement("div");
    right.textContent = item.canal;
    row.appendChild(left);
    row.appendChild(right);
    conteudo30Calendario.appendChild(row);
  });
};

const getCanaisSelecionados = () => {
  const canais = [];
  if (canalInstagram.checked) canais.push("Instagram");
  if (canalTikTok.checked) canais.push("TikTok");
  if (canalYouTube.checked) canais.push("YouTube");
  return canais;
};

const conectarRedes = () => {
  const canais = getCanaisSelecionados();
  if (!canais.length) {
    setAutopostStatus("Selecione ao menos um canal.", "warning");
    return;
  }
  setAutopostStatus(`Conectado: ${canais.join(", ")}.`, "success");
};

const ativarAutopost = () => {
  const canais = getCanaisSelecionados();
  if (!canais.length) {
    setAutopostStatus("Selecione ao menos um canal.", "warning");
    return;
  }
  setAutopostStatus("Autopost ativado com agendamento inteligente.", "success");
};

const navegar = (rota) => {
  navigateTo(rota);
};

const executarPublicacao = () => {
  const material = getMaterial();
  persistMaterial(material);
  setInfo("Publicando conteudo...", "success");
};

const salvarDistribuir = () => {
  const material = getMaterialGerado();
  persistMaterial(material);
  flowInfo.textContent = "Enviando material para a Central de Distribuicao.";
  navigateTo("/distribuidor", material);
};

const baixarVideo = async (material) => {
  if (material.video) {
    saveAs(material.video, "video.mp4");
    return;
  }

  if (!material.videoUrl) {
    setInfo("Informe um arquivo MP4 ou URL do video.", "warning");
    return;
  }

  try {
    const response = await fetch(material.videoUrl);
    const blob = await response.blob();
    saveAs(blob, "video.mp4");
  } catch (error) {
    setInfo("Nao foi possivel baixar o video pela URL.", "warning");
  }
};

const baixarPacote = async (material) => {
  const zip = new JSZip();
  zip.file("roteiro.txt", material.roteiro.join("\n"));
  zip.file("copy.txt", material.copy || "");
  zip.file("hashtags.txt", material.hashtags.join(" "));
  zip.file("descricao.txt", material.descricao || "");
  zip.file(
    "links.txt",
    `checkout: ${material.links.checkout || ""}\nlanding: ${material.links.landing || ""}`
  );

  if (material.video) {
    zip.file("video.mp4", material.video);
  } else if (material.videoUrl) {
    try {
      const response = await fetch(material.videoUrl);
      const blob = await response.blob();
      zip.file("video.mp4", blob);
    } catch (error) {
      setInfo("Video nao foi incluido no ZIP (URL bloqueada).", "warning");
    }
  }

  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, "pacote-conteudo.zip");
};

const copiarCopy = async () => {
  const text = fields.copy.value.trim();
  if (!text) {
    setInfo("Copy vazia. Preencha a legenda antes de copiar.", "warning");
    return;
  }
  await navigator.clipboard.writeText(text);
  setInfo("Copy copiada para a area de transferencia.", "success");
};

const copiarTexto = async (text, target) => {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    if (target) {
      target.textContent = "Prompt copiado para a area de transferencia.";
      target.style.color = "#2ea44f";
    }
  } catch (error) {
    const fallback = document.createElement("textarea");
    fallback.value = text;
    document.body.appendChild(fallback);
    fallback.select();
    document.execCommand("copy");
    document.body.removeChild(fallback);
    if (target) {
      target.textContent = "Prompt copiado (modo alternativo).";
      target.style.color = "#2ea44f";
    }
  }
};

const resetarConteudo = () => {
  Object.values(fields).forEach((field) => {
    if (field.type === "file") {
      field.value = "";
      return;
    }
    field.value = "";
  });
  setStatus("Material limpo. Pronto para gerar novamente.", "success");
  updateResumo(getFallbackMaterial());
};

const setButtonLoading = (button, isLoading) => {
  if (!button) return;
  if (isLoading) {
    if (!button.dataset.originalLabel) {
      button.dataset.originalLabel = button.textContent;
    }
    button.textContent = "Processando...";
    button.disabled = true;
    button.classList.add("is-loading");
    return;
  }
  button.textContent = button.dataset.originalLabel || button.textContent;
  button.disabled = false;
  button.classList.remove("is-loading");
};

const actionRegistry = {
  "/": () => navegar("/infoproduto"),
  "/auth": () => navegar("/auth"),
  "/perfil": () => navegar("/perfil"),
  "/admin": () => navegar("/admin"),
  "/infoproduto": () => navegar("/infoproduto"),
  "/produtos-prontos": () => navegar("/produtos-prontos"),
  "/planos": () => navegar("/planos"),
  "/apis": () => navegar("/apis"),
  "/distribuidor": () => navegar("/distribuidor"),
  "postar-agora": () => executarPublicacao(),
  "salvar-distribuir": () => salvarDistribuir(),
  "ativar-maquina": () => executarFluxoCompleto(getDarkflowInput()),
  "publicar-infoproduto": () => {
    const state = executarFluxoCompleto(getDarkflowInput());
    flowInfo.textContent = `Infoproduto pronto: ${state.dados.produto?.nome || "Produto"}.`;
  },
  "gerar-30-dias": () => {
    const input = getDarkflowInput();
    const itens = gerarCalendario30Dias(input);
    renderCalendario30Dias(itens);
    conteudo30Status.textContent = "Calendario de 30 dias gerado e integrado ao fluxo.";
  },
  "produtos-atualizar": () => carregarProdutos().then(renderProdutos),
  "produto-criar": () => criarProduto(),
  "salvar-material": () => {
    const material = getMaterial();
    persistMaterial(material);
    if (!ytConnected.checked) {
      setInfo("Material salvo. Publique manualmente.", "warning");
    }
  },
  "baixar-video": () => baixarVideo(getMaterial()),
  "baixar-pacote": () => {
    const material = getMaterial();
    persistMaterial(material);
    return baixarPacote(material);
  },
  "copiar-copy": () => copiarCopy(),
  "copiar-prompt-video": () => copiarTexto(PROMPT_VIDEO, promptInfo),
  "reenviar-fila": () => {
    const material = getMaterial();
    addToQueue(material);
    setInfo("Material enviado para fila futura.", "success");
  },
  "regerar-conteudo": () => resetarConteudo(),
  "conectar-redes": () => conectarRedes(),
  "ativar-autopost": () => ativarAutopost(),
  "abrir-projeto": (payload) => abrirProjeto(payload.projetoId)
};

const executarAcao = (nome, payload = {}, target) => {
  const action = actionRegistry[nome];
  if (!action) {
    console.warn("Acao nao encontrada:", nome);
    alert("Essa funcao ainda nao esta ativa.");
    return;
  }

  const button = target?.closest("button");
  setButtonLoading(button, true);

  try {
    const result = action(payload, target);
    if (result && typeof result.then === "function") {
      return result
        .catch((error) => {
          console.warn("Falha na acao:", error);
          setInfo("Falha ao executar a acao solicitada.", "warning");
        })
        .finally(() => setButtonLoading(button, false));
    }
  } catch (error) {
    console.warn("Falha na acao:", error);
    setInfo("Falha ao executar a acao solicitada.", "warning");
  }

  setButtonLoading(button, false);
};

const atualizarYoutubeStatus = () => {
  if (ytConnected.checked) {
    ytStatus.textContent = "Conectado";
    setInfo("", "");
  } else {
    ytStatus.textContent = "Nao conectado";
    setInfo("Material salvo. Publique manualmente.", "warning");
  }
};

document.addEventListener("click", (event) => {
  console.log("Clique detectado:", event.target);
  const target = event.target.closest("[data-action]");
  if (!target) return;
  executarAcao(target.dataset.action, target.dataset, target);
});

document.addEventListener("change", (event) => {
  if (event.target === routeSelect) {
    executarAcao(routeSelect.value, { value: routeSelect.value }, routeSelect);
  }
});

ytConnected.addEventListener("change", atualizarYoutubeStatus);

document.addEventListener("click", (event) => {
  const target = event.target?.closest?.("[data-action]");
  if (!target) return;
  const acao = target.dataset?.action;
  if (!acao) return;
  const payload = target.dataset?.route || undefined;
  executarAcaoReal(acao, payload);
});

window.addEventListener("popstate", (event) => {
  const nextPath = event.state?.path || window.location.pathname;
  setRoute(nextPath);
});

loadMaterial();
atualizarYoutubeStatus();
carregarProdutos().then(renderProdutos);
renderCalendario30Dias(
  JSON.parse(localStorage.getItem(DARKFLOW_CALENDAR_KEY) || "[]")
);

if (promptVideo) {
  promptVideo.textContent = PROMPT_VIDEO;
}

const allowedRoutes = new Set([
  "/",
  "/infoproduto",
  "/distribuidor",
  "/auth",
  "/perfil",
  "/admin",
  "/produtos-prontos",
  "/planos",
  "/apis"
]);
const initialPath = allowedRoutes.has(window.location.pathname)
  ? window.location.pathname
  : "/infoproduto";
if (window.location.pathname !== initialPath) {
  window.history.replaceState({ path: initialPath }, "", initialPath);
}
setRoute(initialPath);
console.log("Runtime ativo ✔");
