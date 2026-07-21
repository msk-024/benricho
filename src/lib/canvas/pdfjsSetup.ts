import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// pdf.js のレンダリングを Web Worker で行うための初期化(モジュール読み込み時に1回)
GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export { getDocument };
