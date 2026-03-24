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
const saveStatus = document.getElementById("saveStatus");
const infoAviso = document.getElementById("infoAviso");
const ytConnected = document.getElementById("ytConnected");
const ytStatus = document.getElementById("ytStatus");

const STORAGE_KEY = "material_salvo";
const QUEUE_KEY = "fila_publicacao";

const setStatus = (message, tone) => {
  saveStatus.textContent = message;
  saveStatus.style.color = tone === "success" ? "#2ea44f" : "#6f6f6f";
};

const setInfo = (message, tone) => {
  infoAviso.textContent = message;
  infoAviso.style.color = tone === "warning" ? "#d97706" : "#6f6f6f";
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

const persistMaterial = (material) => {
  const payload = { ...material, video: null };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  setStatus("Material salvo com sucesso.", "success");
};

const loadMaterial = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    fields.titulo.value = data.titulo || "";
    fields.descricao.value = data.descricao || "";
    fields.cta.value = data.cta || "";
    fields.roteiro.value = (data.roteiro || []).join("\n");
    fields.copy.value = data.copy || "";
    fields.hashtags.value = (data.hashtags || []).join(" ");
    fields.checkout.value = data.links?.checkout || "";
    fields.landing.value = data.links?.landing || "";
    fields.videoUrl.value = data.videoUrl || "";
    setStatus("Material carregado do salvamento local.", "success");
  } catch (error) {
    setStatus("Falha ao carregar material salvo.", "warning");
  }
};

const addToQueue = (material) => {
  const raw = localStorage.getItem(QUEUE_KEY);
  const queue = raw ? JSON.parse(raw) : [];
  queue.push({ ...material, queuedAt: new Date().toISOString() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
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

const resetarConteudo = () => {
  Object.values(fields).forEach((field) => {
    if (field.type === "file") {
      field.value = "";
      return;
    }
    field.value = "";
  });
  setStatus("Material limpo. Pronto para gerar novamente.", "success");
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

btnSalvar.addEventListener("click", () => {
  const material = getMaterial();
  persistMaterial(material);
  if (!ytConnected.checked) {
    setInfo("Material salvo. Publique manualmente.", "warning");
  }
});

btnBaixarPacote.addEventListener("click", async () => {
  const material = getMaterial();
  persistMaterial(material);
  await baixarPacote(material);
});

btnBaixarVideo.addEventListener("click", async () => {
  const material = getMaterial();
  await baixarVideo(material);
});

btnCopiarCopy.addEventListener("click", copiarCopy);

btnReenviar.addEventListener("click", () => {
  const material = getMaterial();
  addToQueue(material);
  setInfo("Material enviado para fila futura.", "success");
});

btnRegerar.addEventListener("click", resetarConteudo);
ytConnected.addEventListener("change", atualizarYoutubeStatus);

loadMaterial();
atualizarYoutubeStatus();
