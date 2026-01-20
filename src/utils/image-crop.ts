type CroppedAreaPixels = {
  width: number;
  height: number;
  x: number;
  y: number;
};

function createImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (e) => reject(e));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = src;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Não foi possível gerar a imagem recortada."));
        else resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

export async function getCroppedImageBlob(params: {
  imageSrc: string;
  crop: CroppedAreaPixels;
  outputSize?: number;
  mimeType?: "image/jpeg" | "image/png" | "image/webp";
  quality?: number;
}): Promise<Blob> {
  const {
    imageSrc,
    crop,
    outputSize = 512,
    mimeType = "image/jpeg",
    quality = 0.92,
  } = params;

  const image = await createImage(imageSrc);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não suportado neste navegador.");

  canvas.width = outputSize;
  canvas.height = outputSize;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outputSize,
    outputSize,
  );

  return await canvasToBlob(canvas, mimeType, quality);
}

export type { CroppedAreaPixels };