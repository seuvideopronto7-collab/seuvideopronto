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

export { createJob, getJob, updateJob };
