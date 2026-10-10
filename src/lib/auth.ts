import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { query } from "@/lib/db";

export const COOKIE_NAME = "archive_session";
const secretValue = process.env.AUTH_SECRET;
if (process.env.NODE_ENV === "production" && (!secretValue || secretValue.length < 32)) {
  throw new Error("AUTH_SECRET must be set to a random value of at least 32 characters in production.");
}
const secret = new TextEncoder().encode(secretValue || "development-only-change-this-secret-now-123456789");

export type SessionUser = { id: string; name: string; email: string; role: "PLAYER" | "ADMIN"; teamId: string | null; teamName: string | null; joinCode: string | null };

export async function createSession(user: Omit<SessionUser, "teamName" | "joinCode">) {
  const token = await new SignJWT({ name: user.name, email: user.email, role: user.role, teamId: user.teamId })
    .setProtectedHeader({ alg: "HS256" }).setSubject(user.id).setIssuedAt().setExpirationTime("7d").sign(secret);
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const id = payload.sub;
    if (!id || typeof payload.role !== "string") return null;
    const result = await query<SessionUser & { id: string }>(`
      SELECT u.id, u.name, u.email, u.role, u.team_id AS "teamId",
             t.name AS "teamName", t.join_code AS "joinCode"
      FROM users u LEFT JOIN teams t ON t.id = u.team_id WHERE u.id = $1
    `, [id]);
    return result.rows[0] ?? null;
  } catch { return null; }
}

export async function requireUser() {
  const user = await getSession();
  if (!user) throw new AuthError("يجب تسجيل الدخول أولًا.", 401);
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new AuthError("هذه الصفحة مخصصة للإدارة.", 403);
  return user;
}

export class AuthError extends Error { constructor(message: string, public status = 401) { super(message); } }
export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) return Response.json({ error: error.message }, { status: error.status });
  console.error(error);
  return Response.json({ error: "حدث خطأ غير متوقع. راجع إعدادات الخادم." }, { status: 500 });
}
