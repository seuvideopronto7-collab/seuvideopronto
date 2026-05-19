/**
 * 🎞️ mediaPipeAnimator — Animação de imagem (Ken Burns / zoom / parallax).
 *
 * Gera o filtro FFmpeg `zoompan` apropriado por tipo de animação.
 * Quando MediaPipe Tasks Vision está disponível, pode ser usado para detectar
 * face/objeto e centralizar o zoom — caso contrário, aplica fallback seguro
 * (centro geométrico). MediaPipe é OPCIONAL: nunca quebra o render.
 */

export type AnimationKind =
  | "kenburns"
  | "zoom-in"
  | "zoom-out"
  | "slide-left"
  | "slide-right"
  | "slide-up"
  | "slide-down"
  | "parallax"
  | "none";

export interface AnimationFocus {
  /** Coordenadas normalizadas (0..1) do ponto de interesse. */
  x: number;
  y: number;
  source: "mediapipe" | "fallback";
}

/**
 * Tenta detectar foco visual via MediaPipe Tasks Vision (face detector).
 * Retorna fallback (centro) se MediaPipe não estiver disponível ou falhar.
 */
export const detectFocus = async (imageUrl: string): Promise<AnimationFocus> => {
  const fallback: AnimationFocus = { x: 0.5, y: 0.5, source: "fallback" };
  if (typeof window === "undefined") return fallback;
  try {
    const vision = await import(
      /* @vite-ignore */ "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm"
    ).catch(() => null);
    if (!vision) return fallback;

    const { FilesetResolver, FaceDetector } = vision as any;
    const fileset = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
    );
    const detector = await FaceDetector.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
      },
      runningMode: "IMAGE",
    });

    const img = await loadImage(imageUrl);
    const result = detector.detect(img);
    detector.close?.();

    const det = result?.detections?.[0]?.boundingBox;
    if (!det) return fallback;
    const cx = (det.originX + det.width / 2) / img.naturalWidth;
    const cy = (det.originY + det.height / 2) / img.naturalHeight;
    return { x: clamp01(cx), y: clamp01(cy), source: "mediapipe" };
  } catch (err) {
    console.warn("[mediaPipeAnimator] MediaPipe indisponível, usando fallback:", err);
    return fallback;
  }
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });

/**
 * Constrói filtro zoompan FFmpeg para Ken Burns / zoom / slide / parallax.
 */
export const buildZoompan = (
  width: number,
  height: number,
  frames: number,
  animation: AnimationKind,
  focus?: AnimationFocus,
): string => {
  const zoomIn = "min(zoom+0.0015,1.12)";
  const zoomOut = "max(zoom-0.0015,1.0)";
  const parallaxZoom = "min(zoom+0.0008,1.06)";
  const zoom =
    animation === "zoom-out"
      ? zoomOut
      : animation === "parallax"
        ? parallaxZoom
        : animation === "none"
          ? "1"
          : zoomIn;

  const fx = focus ? focus.x : 0.5;
  const fy = focus ? focus.y : 0.5;

  const centerX = `(iw-ow)*${fx.toFixed(3)}`;
  const centerY = `(ih-oh)*${fy.toFixed(3)}`;
  const slideX = `(iw-ow)*on/${frames}`;
  const slideY = `(ih-oh)*on/${frames}`;
  const slideXRev = `(iw-ow)*(1-on/${frames})`;
  const slideYRev = `(ih-oh)*(1-on/${frames})`;

  const x =
    animation === "slide-left" ? slideXRev : animation === "slide-right" ? slideX : centerX;
  const y =
    animation === "slide-up" ? slideYRev : animation === "slide-down" ? slideY : centerY;

  return `zoompan=z='${zoom}':x='${x}':y='${y}':d=${frames}:s=${width}x${height}`;
};
