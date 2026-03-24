import express from "express";

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

const processVideoJob = async (id) => {
  const job = jobs.get(String(id));
  if (!job) {
    throw new Error("Job nao encontrado");
  }

  await updateJob(id, { status: "processing", progress: 20 });
  await delay(600);
  await updateJob(id, { progress: 60 });
  await delay(600);
  await updateJob(id, {
    status: "completed",
    progress: 100,
    video_url: `https://example.com/videos/${id}.mp4`
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
