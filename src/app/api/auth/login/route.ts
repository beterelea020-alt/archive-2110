import bcrypt from "bcryptjs";
import { z } from "zod";
import { query } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
const schema = z.object({ email: z.string().trim().email().transform(v => v.toLowerCase()), password: z.string().min(1).max(100) });
export async function POST(request: Request) {
  try {
    const data = schema.parse(await request.json());
    const result = await query<{id:string;name:string;email:string;password_hash:string;role:"PLAYER"|"ADMIN";team_id:string|null}>(
      "SELECT id,name,email,password_hash,role,team_id FROM users WHERE email=$1", [data.email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(data.password, user.password_hash))) return Response.json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة." }, { status: 401 });
    await createSession({ id: user.id, name: user.name, email: user.email, role: user.role, teamId: user.team_id });
    return Response.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, role: user.role, teamId: user.team_id } });
  } catch (e) { return errorResponse(e); }
}
