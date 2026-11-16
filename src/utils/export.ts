import { toPng } from 'html-to-image';

function download(href: string, filename: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  download(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadPNG(node: HTMLElement, filename: string) {
  const bg = getComputedStyle(document.body).backgroundColor;
  const url = await toPng(node, { pixelRatio: 2, backgroundColor: bg, cacheBust: true });
  download(url, filename);
}

export function readJSONFile(file: File): Promise<unknown> {
  return file.text().then((t) => JSON.parse(t));
}

export const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
