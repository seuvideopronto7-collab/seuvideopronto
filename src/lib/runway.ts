const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY!;
const RUNWAY_API_VERSION = process.env.RUNWAY_API_VERSION || "2024-11-06";

export async function createRunwayImageToVideoTask(params: {
  imageUrl: string;
  promptText: string;
  duration?: number;
  ratio?: "1280:720" | "720:1280" | "1080:1920" | "1920:1080";
}) {
  const res = await fetch("https://api.runwayml.com/v1/image_to_video", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RUNWAY_API_KEY}`,
      "Content-Type": "application/json",
      "X-Runway-Version": RUNWAY_API_VERSION,
    },
    body: JSON.stringify({
      model: "gen4.5",
      promptImage: params.imageUrl,
      promptText: params.promptText,
      duration: params.duration ?? 5,
      ratio: params.ratio ?? "1080:1920",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Runway create task failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<{ id: string }>;
}

export async function getRunwayTask(taskId: string) {
  const res = await fetch(`https://api.runwayml.com/v1/tasks/${taskId}`, {
    headers: {
      Authorization: `Bearer ${RUNWAY_API_KEY}`,
      "X-Runway-Version": RUNWAY_API_VERSION,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Runway get task failed: ${res.status} ${text}`);
  }

  return res.json();
}
