import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/adminAuth";
import { supabaseService } from "@/lib/supabaseServer";

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
    const ext = safeExt(file.name || "");
    const objectPath = `${folder || "uploads"}/${crypto.randomUUID()}${ext}`;
    const storagePath = `${encodeURIComponent(bucket)}/${encodePath(objectPath)}`;

    const uploadBody = new Blob([await file.arrayBuffer()], { type: file.type || "application/octet-stream" });
    const { error } = await supabaseService().storage.from(bucket).upload(objectPath, uploadBody, {
      cacheControl: "60",
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });
    if (error) {
      return NextResponse.json({ error: error.message || "upload_failed", bucket }, { status: 500 });
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

