import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } })
  : null;

const ensureSupabase = () => {
  if (!supabase) {
    throw new Error("Supabase env nao configurado");
  }
};

const createJob = async ({ imageUrl, prompt, userId }) => {
  ensureSupabase();
  const { data, error } = await supabase
    .from("video_jobs")
    .insert({
      user_id: userId,
      status: "queued",
      progress: 0,
      image_url: imageUrl || null,
      prompt: prompt || null,
      video_url: null,
      error: null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data;
};

const updateJob = async (id, updates) => {
  ensureSupabase();
  const { data, error } = await supabase
    .from("video_jobs")
    .update({ ...updates })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
};

const getJob = async (id) => {
  ensureSupabase();
  const { data, error } = await supabase
    .from("video_jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
};

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
  const job = await getJob(jobId);
  if (!job) throw new Error("Job nao encontrado");

  const sourceImageUrl = job.image_url;
  if (!sourceImageUrl) throw new Error("imageUrl obrigatorio");

  const promptText = job.prompt || buildCinematicPrompt("outro", "luxo", false, false);

  await updateJob(jobId, {
    status: "processing",
    progress: 10,
    prompt: promptText,
    image_url: sourceImageUrl,
    error: null,
  });

  const response = await fetch(`${supabaseUrl}/functions/v1/generate-video`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      imageUrl: sourceImageUrl,
      estilo: "cinematografico",
      movimento: "zoom cinematografico",
      duracao: 6,
      prompt: promptText,
      conteudoRelacionado: true,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    await updateJob(jobId, { status: "error", progress: 100, error: text || "Falha ao gerar video" });
    return;
  }

  const data = await response.json();
  const videoUrl = data?.videoUrl || data?.video_url;

  if (!videoUrl) {
    await updateJob(jobId, { status: "error", progress: 100, error: "Video vazio" });
    return;
  }

  await updateJob(jobId, { status: "completed", progress: 100, video_url: videoUrl, error: null });
};

// Verify a Bearer JWT and return the authenticated user (or null)
const getAuthedUser = async (req) => {
  ensureSupabase();
  const authHeader = req.headers["authorization"] || req.headers["Authorization"] || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
};

const isAdminUser = async (userId) => {
  ensureSupabase();
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
};

app.post("/api/video-jobs", async (req, res) => {
  try {
    const user = await getAuthedUser(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { imageUrl, prompt } = req.body || {};
    // Always derive user_id from the JWT — never trust request body
    const job = await createJob({ imageUrl, prompt, userId: user.id });

    queueMicrotask(() => {
      processVideoJob(job.id).catch(async (err) => {
        await updateJob(job.id, {
          status: "error",
          error: err.message
        });
      });
    });

    res.json({ id: job.id });
  } catch (error) {
    res.status(500).json({ error: error?.message || "Falha ao criar job" });
  }
});

app.get("/api/webhook/health", async (_req, res) => {
  res.json({ ok: true, webhook: "active" });
});

app.get("/api/video-jobs/:id", async (req, res) => {
  try {
    const user = await getAuthedUser(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const job = await getJob(req.params.id);
    if (!job) {
      res.status(404).json({ error: "Job nao encontrado" });
      return;
    }
    if (job.user_id !== user.id) {
      const admin = await isAdminUser(user.id);
      if (!admin) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
    }
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: error?.message || "Falha ao buscar job" });
  }
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`Video jobs API rodando na porta ${port}`);
});
