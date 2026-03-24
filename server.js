import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const app = express();
app.use(express.json());

const jobs = new Map();
let nextId = 1;

const createJob = ({ imageUrl, productType, style, useDarkflow, useViral }) => {
  const id = String(nextId++);
  const job = {
    id,
    imageUrl: imageUrl || null,
    productType: productType || null,
    style: style || null,
    useDarkflow: Boolean(useDarkflow),
    useViral: Boolean(useViral),
    status: "queued",
    progress: 0,
    error_message: null,
    created_at: new Date().toISOString()
  };
  jobs.set(id, job);
  return job;
};

const updateJob = async (id, updates) => {
  const job = jobs.get(String(id));
  if (!job) return null;
  const updated = { ...job, ...updates, updated_at: new Date().toISOString() };
  jobs.set(String(id), updated);
  return updated;
};

const getJob = async (id) => jobs.get(String(id)) || null;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runwayTasks = new Map();

const buildCinematicPrompt = (productType, style, useDarkflow = false, useViral = false) => {
  const base =
    "Ultra cinematic commercial product shot, premium lighting, rich contrast, depth of field, elegant camera motion, product hero frame, luxury ad aesthetic, floating particles, premium glow, realistic reflections, polished shadows.";

  const byType = {
    natural: "Natural supplement product, botanical cues, healthy vitality, trust and purity.",
    suplemento: "Premium supplement bottle, performance, energy, confidence, high-conversion commercial look.",
    cosmetico: "Beauty product, clean luxury skincare ad, soft highlights, refined elegance.",
    tecnologia: "Futuristic product reveal, sharp reflections, sleek surfaces, innovation-driven mood.",
    outro: "Premium product reveal with commercial-grade realism and emotional appeal.",
  };

  const byStyle = {
    luxo: "Golden highlights, black background, prestige and exclusivity.",
    fitness: "Power, motion, dynamic energy, bold contrast and drive.",
    saude: "Clean authority, wellbeing, clarity, trust, premium clinical feel.",
    tecnologia: "Neon accents, precision, futuristic premium mood.",
  };

  const darkflow = useDarkflow
    ? "Darkflow mode: dramatic shadows, purple undertones, more suspense, stronger cinematic tension."
    : "";

  const viral = useViral
    ? "Viral cut awareness: first seconds must feel punchy, immediate hook, stronger visual impact."
    : "";

  const typeKey = productType?.toLowerCase() || "outro";
  const styleKey = style?.toLowerCase() || "";

  return [base, byType[typeKey] ?? byType.outro, byStyle[styleKey], darkflow, viral].filter(Boolean).join(" ");
};

const buildScript = (productType, style) => {
  const hooks = {
    natural: "Seu corpo não precisa aceitar cansaço como rotina.",
    suplemento: "Alta performance começa naquilo que você entrega ao seu corpo.",
    cosmetico: "Sua pele merece mais do que um cuidado comum.",
    tecnologia: "Quando inovação encontra resultado, o padrão muda.",
    outro: "Um produto certo muda a percepção em segundos.",
  };

  const angle = {
    luxo: "Apresente o produto como premium, desejado e exclusivo.",
    fitness: "Enfatize energia, foco, desempenho e consistência.",
    saude: "Destaque confiança, bem-estar e rotina inteligente.",
    tecnologia: "Valorize inovação, precisão e sofisticação.",
  };

  return [
    hooks[productType] ?? hooks.outro,
    "Existe uma forma mais inteligente de transformar a sua rotina com presença, impacto e resultado.",
    angle[style] ?? angle.luxo,
    "Conheça agora a solução que une apresentação premium e percepção de valor desde o primeiro olhar.",
  ].join(" ");
};

const buildCaption = (script, style) => {
  const hashtagsByStyle = {
    luxo: ["#luxo", "#premium", "#exclusive"],
    fitness: ["#fitness", "#energia", "#performance"],
    saude: ["#saude", "#bemestar", "#rotinainteligente"],
    tecnologia: ["#tecnologia", "#inovacao", "#futuro"],
  };
  const hashtags = hashtagsByStyle[style] ?? ["#produto", "#oferta", "#novidade"];
  const shortScript = script.length > 160 ? `${script.slice(0, 157)}...` : script;
  return `${shortScript}\n\n${hashtags.join(" ")}`;
};

const createRunwayImageToVideoTask = async ({ imageUrl, promptText, duration, ratio }) => {
  const id = `runway_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const task = {
    id,
    status: "PENDING",
    output: [],
    promptText,
    duration,
    ratio,
    created_at: new Date().toISOString(),
  };
  runwayTasks.set(id, task);

  queueMicrotask(async () => {
    await delay(1500);
    const existing = runwayTasks.get(id);
    if (!existing) return;
    runwayTasks.set(id, {
      ...existing,
      status: "SUCCEEDED",
      output: [`https://example.com/videos/${id}.mp4`],
    });
  });

  return task;
};

const getRunwayTask = async (id) => {
  const task = runwayTasks.get(id);
  if (!task) {
    return { id, status: "FAILED", failure: "Runway task not found" };
  }
  return task;
};

const generateVoiceover = async (script) => {
  const payload = `VOICEOVER:${script}`;
  return Buffer.from(payload, "utf-8");
};

const saveTempFile = async (filename, data) => {
  const outputPath = path.join(os.tmpdir(), filename);
  await fs.writeFile(outputPath, data);
  return outputPath;
};

const downloadToTemp = async (url, filename) => {
  const outputPath = path.join(os.tmpdir(), filename);
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(outputPath, buffer);
  } catch {
    await fs.writeFile(outputPath, Buffer.alloc(0));
  }
  return outputPath;
};

const resolveDefaultSoundtrack = async (style) => {
  const filename = `soundtrack-${style || "default"}.mp3`;
  const outputPath = path.join(os.tmpdir(), filename);
  try {
    await fs.access(outputPath);
  } catch {
    await fs.writeFile(outputPath, Buffer.alloc(0));
  }
  return outputPath;
};

const composeFinalVideo = async ({ videoPath, outputPath }) => {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.copyFile(videoPath, outputPath);
  return outputPath;
};

const uploadFinalVideo = async (jobId, finalPath) => {
  if (finalPath) {
    return `https://example.com/final/${jobId}.mp4`;
  }
  return `https://example.com/final/${jobId}.mp4`;
};

const processVideoJob = async (jobId) => {
  await updateJob(jobId, { status: "generating_script", progress: 10 });

  const job = await getJob(jobId);
  if (!job) throw new Error("Job nao encontrado");

  const productType = job.product_type ?? job.productType ?? "outro";
  const style = job.style ?? "luxo";
  const useDarkflow = job.use_darkflow ?? job.useDarkflow ?? false;
  const useViral = job.use_viral ?? job.useViral ?? false;
  const sourceImageUrl = job.source_image_url ?? job.imageUrl ?? job.image_url;

  const promptText = buildCinematicPrompt(productType, style, useDarkflow, useViral);
  const script = buildScript(productType, style);

  await updateJob(jobId, { script_text: script, progress: 20 });

  await updateJob(jobId, { status: "generating_video", progress: 30 });

  const runwayTask = await createRunwayImageToVideoTask({
    imageUrl: sourceImageUrl,
    promptText,
    duration: 5,
    ratio: "1080:1920",
  });

  await updateJob(jobId, { runway_task_id: runwayTask.id, provider: "runway" });

  let outputUrl;
  for (let i = 0; i < 120; i++) {
    const task = await getRunwayTask(runwayTask.id);

    if (task.status === "SUCCEEDED" || task.status === "succeeded") {
      outputUrl = task.output?.[0] ?? task.artifacts?.[0]?.url;
      break;
    }

    if (task.status === "FAILED" || task.status === "failed") {
      throw new Error(task.failure || task.failureCode || "Runway task failed");
    }

    await delay(5000);
  }

  if (!outputUrl) throw new Error("Runway task timeout sem output");

  await updateJob(jobId, { video_url: outputUrl, status: "generating_voice", progress: 65 });

  const voiceMp3 = await generateVoiceover(script);
  const voicePath = await saveTempFile(`${jobId}-voice.mp3`, voiceMp3);

  await updateJob(jobId, { progress: 78 });

  const videoPath = await downloadToTemp(outputUrl, `${jobId}-video.mp4`);
  const soundtrackPath = await resolveDefaultSoundtrack(style);

  await updateJob(jobId, { status: "composing", progress: 88 });

  const finalPath = await composeFinalVideo({
    videoPath,
    voicePath,
    soundtrackPath,
    outputPath: path.join(os.tmpdir(), `${jobId}-final.mp4`),
  });

  const finalUrl = await uploadFinalVideo(jobId, finalPath);

  await updateJob(jobId, {
    status: "completed",
    progress: 100,
    video_url: finalUrl,
    caption_text: buildCaption(script, style),
  });
};

app.post("/api/video-jobs", async (req, res) => {
  const { imageUrl, productType, style, useDarkflow, useViral } = req.body || {};
  const job = createJob({
    imageUrl,
    productType,
    style,
    useDarkflow,
    useViral
  });

  queueMicrotask(() => {
    processVideoJob(job.id).catch(async (err) => {
      await updateJob(job.id, {
        status: "failed",
        error_message: err.message
      });
    });
  });

  res.json({ id: job.id });
});

app.get("/api/webhook/health", async (_req, res) => {
  res.json({ ok: true, webhook: "active" });
});

app.get("/api/video-jobs/:id", async (req, res) => {
  const job = await getJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: "Job nao encontrado" });
    return;
  }
  res.json(job);
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`Video jobs API rodando na porta ${port}`);
});
