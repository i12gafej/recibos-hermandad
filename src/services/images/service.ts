type TextBox = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

type RenderOptions = {
  textBox: TextBox;
  fontFamily: string;
  fontSize: number;
  color: string;
  fontWeight?: "normal" | "bold";
};

export async function loadTemplate(url: string) {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const testLine = current ? `${current} ${word}` : word;
    const { width } = ctx.measureText(testLine);
    if (width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = testLine;
    }
  });

  if (current) lines.push(current);
  return lines;
}

export async function renderTextOnTemplate(
  img: HTMLImageElement,
  text: string,
  options: RenderOptions
) {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  ctx.fillStyle = options.color;
  const weight = options.fontWeight ?? "normal";
  ctx.font = `${weight} ${options.fontSize}px ${options.fontFamily}`;
  ctx.textBaseline = "top";

  const maxWidth = options.textBox.x2 - options.textBox.x1;
  const maxHeight = options.textBox.y2 - options.textBox.y1;
  const lineHeight = Math.round(options.fontSize * 1.25);

  const lines = wrapText(ctx, text, maxWidth);
  let y = options.textBox.y1;
  for (const line of lines) {
    if (y + lineHeight > options.textBox.y2) break;
    ctx.fillText(line, options.textBox.x1, y);
    y += lineHeight;
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("No se pudo exportar la imagen"));
    }, "image/png");
  });

  return blob;
}
