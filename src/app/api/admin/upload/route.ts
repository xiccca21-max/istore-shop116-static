import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/adminAuth";

async function mustAuth(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const ok = await verifySessionToken(token);
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return null;
}

function must(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function bucketName() {
  return (process.env.SUPABASE_BUCKET || "images").trim();
}

function safeExt(filename: string) {
  const m = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  if (!m) return "";
  const ext = m[1];
  if (["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext)) return `.${ext}`;
  return "";
}

function encodePath(path: string) {
  return path
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

export async function POST(req: NextRequest) {
  const auth = await mustAuth(req);
  if (auth) return auth;

  try {
    const form = await req.formData();
    const file = form.get("file");
    const folder = String(form.get("folder") || "uploads").replace(/[^a-z0-9/_-]/gi, "").replace(/^\/+/, "").replace(/\/+$/, "");
    if (!file || !(file instanceof File)) return NextResponse.json({ error: "file_required" }, { status: 400 });

    const bucket = bucketName();
    const baseUrl = must("SUPABASE_URL").replace(/\/$/, "");
    const serviceKey = must("SUPABASE_SERVICE_ROLE_KEY");
    const ext = safeExt(file.name || "");
    const objectPath = `${folder || "uploads"}/${crypto.randomUUID()}${ext}`;
    const storagePath = `${encodeURIComponent(bucket)}/${encodePath(objectPath)}`;

    const bytes = new Uint8Array(await file.arrayBuffer());
    let response: Response | null = null;
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      try {
        response = await fetch(`${baseUrl}/storage/v1/object/${storagePath}`, {
          method: "POST",
          headers: {
            apikey: serviceKey,
            authorization: `Bearer ${serviceKey}`,
            "cache-control": "3600",
            "content-type": file.type || "application/octet-stream",
            "x-upsert": "true",
          },
          body: bytes,
          signal: controller.signal,
          cache: "no-store",
        });
        if (response.ok || response.status < 500) break;
      } catch (error) {
        lastError = error;
      } finally {
        clearTimeout(timer);
      }
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }

    if (!response) {
      return NextResponse.json({ error: lastError instanceof Error ? lastError.message : String(lastError || "upload_failed") }, { status: 500 });
    }
    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: text || `upload_failed_${response.status}`, bucket }, { status: 500 });
    }

    const publicUrl = `${baseUrl}/storage/v1/object/public/${storagePath}`;
    const versionedUrl = `${publicUrl}?v=${Date.now()}`;
    return NextResponse.json(
      {
        data: {
          url: versionedUrl,
          rawUrl: publicUrl,
          path: objectPath,
          bucket,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

