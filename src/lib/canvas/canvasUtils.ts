/**
 * Canvas / DOM に依存する副作用層。純粋ロジック(../lib 直下)とは分離して薄く保つ。
 */

export interface CanvasWithContext {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
}

/**
 * 指定サイズの Canvas と 2D コンテキストを生成する。
 *
 * @precondition width, height は 1 以上の整数
 * @throws {Error} 2D コンテキストが取得できない場合
 */
export function createCanvas(width: number, height: number): CanvasWithContext {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1
  ) {
    throw new RangeError(`Canvasサイズが不正です: ${width}×${height}`);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context === null)
    throw new Error("Canvas 2D コンテキストを取得できませんでした");
  context.imageSmoothingQuality = "high";
  return { canvas, context };
}

/**
 * 画像ファイルを HTMLImageElement として読み込み、デコード完了まで待つ。
 *
 * @precondition file はブラウザがデコード可能な画像
 * @throws {Error} デコードに失敗した場合(非対応形式・壊れたファイル)
 */
export async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    return image;
  } catch {
    throw new Error(
      `画像を読み込めませんでした(非対応形式の可能性): ${file.name}`,
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** 画像を等倍で Canvas に描画する。backgroundColor 指定時は下地を塗ってから描画する */
export function drawImageToCanvas(
  image: HTMLImageElement,
  backgroundColor?: string,
): HTMLCanvasElement {
  const { canvas, context } = createCanvas(
    image.naturalWidth,
    image.naturalHeight,
  );
  if (backgroundColor !== undefined) {
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.drawImage(image, 0, 0);
  return canvas;
}

/** Canvas 全体の ImageData を取得する */
export function getCanvasImageData(canvas: HTMLCanvasElement): ImageData {
  const context = canvas.getContext("2d");
  if (context === null)
    throw new Error("Canvas 2D コンテキストを取得できませんでした");
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

/** ImageData を新しい Canvas に書き込む */
export function imageDataToCanvas(imageData: ImageData): HTMLCanvasElement {
  const { canvas, context } = createCanvas(imageData.width, imageData.height);
  context.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Canvas を指定 MIME タイプの Blob に書き出す。
 *
 * @postcondition 戻り値の Blob.type は要求した mimeType に一致する
 * @throws {Error} ブラウザが該当形式のエンコードに未対応の場合
 */
export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number,
): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mimeType, quality);
  });
  if (blob === null || blob.type !== mimeType) {
    throw new Error(
      `このブラウザは ${mimeType} 形式の書き出しに対応していません`,
    );
  }
  return blob;
}

export async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

export async function canvasToPngBytes(
  canvas: HTMLCanvasElement,
): Promise<Uint8Array> {
  return blobToBytes(await canvasToBlob(canvas, "image/png"));
}
