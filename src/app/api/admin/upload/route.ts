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
  const ext = safeExt(file.name || "");
  const objectPath = `${folder}/${crypto.randomUUID()}${ext}`;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sb = supabaseService();
  const { error: upErr } = await sb.storage.from(bucket).upload(objectPath, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data } = sb.storage.from(bucket).getPublicUrl(objectPath);
  return NextResponse.json({ data: { url: data.publicUrl, path: objectPath } }, { status: 201 });
}

