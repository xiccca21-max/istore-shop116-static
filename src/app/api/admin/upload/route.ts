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

function safeExt(filename: string) {
  const m = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  if (!m) return "";
  const ext = m[1];
  if (["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext)) return `.${ext}`;
  return "";
}

export async function POST(req: NextRequest) {
  const auth = await mustAuth(req);
  if (auth) return auth;

  const form = await req.formData();
  const file = form.get("file");
  const folder = String(form.get("folder") || "uploads").replace(/[^a-z0-9/_-]/gi, "").replace(/^\/+/, "").replace(/\/+$/, "");
  if (!file || !(file instanceof File)) return NextResponse.json({ error: "file_required" }, { status: 400 });

  const bucket = must("SUPABASE_BUCKET");
  const baseUrl = must("SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = must("SUPABASE_SERVICE_ROLE_KEY");
  const ext = safeExt(file.name || "");
  const objectPath = `${folder}/${crypto.randomUUID()}${ext}`;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath}`, {
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
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json({ error: text || `upload_failed_${response.status}` }, { status: 500 });
  }

  const publicUrl = `${baseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${objectPath}`;
  const versionedUrl = `${publicUrl}?v=${Date.now()}`;
  return NextResponse.json({
    data: {
      url: versionedUrl,
      rawUrl: publicUrl,
      path: objectPath,
    },
  }, {
    status: 201,
  });
}

