import { cookies } from "next/headers";
import { COOKIE_NAME } from "@/lib/auth";
export async function POST() {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return Response.json({ ok: true });
}
