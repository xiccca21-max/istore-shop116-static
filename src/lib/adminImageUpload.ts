"use client";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const TARGET_MAX_SIDE = 1800;
const TARGET_QUALITY = 0.84;

export async function prepareAdminImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) throw new Error("Можно загрузить только картинку");
  if (file.type === "image/gif" || file.type === "image/svg+xml") {
    if (file.size > MAX_UPLOAD_BYTES) throw new Error("Файл слишком большой. Загрузи PNG/JPG/WEBP до 4 МБ");
    return file;
  }
  if (file.size <= MAX_UPLOAD_BYTES && file.type === "image/webp") return file;

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, TARGET_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Не удалось подготовить картинку");
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, "image/webp", TARGET_QUALITY);
    if (blob.size > MAX_UPLOAD_BYTES) {
      const smaller = await canvasToBlob(canvas, "image/jpeg", 0.78);
      if (smaller.size > MAX_UPLOAD_BYTES) throw new Error("Картинка слишком большая. Уменьши размер файла и попробуй ещё раз");
      return blobToFile(smaller, file.name, "jpg");
    }
    return blobToFile(blob, file.name, "webp");
  } finally {
    bitmap.close();
  }
}

export async function uploadAdminImage(file: File, folder: string): Promise<string> {
  const prepared = await prepareAdminImage(file);
  const fd = new FormData();
  fd.set("file", prepared);
  fd.set("folder", folder);
  let res: Response;
  try {
    res = await fetch("/api/admin/upload", { method: "POST", body: fd, cache: "no-store" });
  } catch {
    throw new Error("Ошибка сети при загрузке картинки");
  }
  if (res.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("unauthorized");
  }
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(humanUploadError(json?.error ? String(json.error) : `upload_failed_${res.status}`));
  }
  const json = await res.json();
  const url = json?.data?.url;
  if (!url || typeof url !== "string") throw new Error("Сервер не вернул ссылку на картинку");
  return url;
}

export function uploadSizeText(file: File) {
  return `${(file.size / 1024 / 1024).toFixed(1)} МБ`;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Не удалось сжать картинку"))), type, quality);
  });
}

function blobToFile(blob: Blob, originalName: string, ext: string) {
  const base = originalName.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${base}.${ext}`, { type: blob.type });
}

function humanUploadError(error: string) {
  if (error === "file_too_large") return "Файл слишком большой. Попробуй JPG/WEBP или картинку меньше 4 МБ";
  if (error === "file_required") return "Файл не выбран";
  return error;
}
