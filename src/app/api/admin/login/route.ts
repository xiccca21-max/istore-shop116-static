import { NextResponse } from "next/server";
import { z } from "zod";
import { adminLogin, ADMIN_COOKIE_NAME } from "@/lib/adminAuth";

const Schema = z.object({ password: z.string().min(1) });

export async function POST(req: Request) {
  const { password } = Schema.parse(await req.json());
  const res = await adminLogin(password);
  if (!res.ok || !res.token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const out = NextResponse.json({ ok: true });
  out.cookies.set(ADMIN_COOKIE_NAME, res.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return out;
}

