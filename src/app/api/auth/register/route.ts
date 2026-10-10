import { randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { query } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { errorResponse } from "@/lib/http";

const schema = z.object({
  name: z.string().trim().min(2).max(70),
  email: z.string().trim().email().max(180).transform(v => v.toLowerCase()),
  password: z.string().min(8).max(100),
  teamName: z.string().trim().max(70).optional(),
  joinCode: z.string().trim().length(6).optional().or(z.literal(""))
});

export async function POST(request: Request) {
  try {
    const data = schema.parse(await request.json());
    const duplicate = await query("SELECT id FROM users WHERE email=$1", [data.email]);
    if (duplicate.rowCount) return Response.json({ error: "البريد الإلكتروني مسجل بالفعل." }, { status: 409 });
    let teamId: string;
    if (data.joinCode) {
      const found = await query<{id:string}>("SELECT id FROM teams WHERE upper(join_code)=upper($1)", [data.joinCode]);
      if (!found.rows[0]) return Response.json({ error: "كود الفريق غير صحيح." }, { status: 400 });
      teamId = found.rows[0].id;
    } else {
      teamId = randomUUID();
      const code = randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
      await query("INSERT INTO teams(id,name,join_code) VALUES($1,$2,$3)", [teamId, data.teamName || `فريق ${data.name}`, code]);
    }
    const id = randomUUID();
    const passwordHash = await bcrypt.hash(data.password, 12);
    try {
      await query("INSERT INTO users(id,name,email,password_hash,role,team_id) VALUES($1,$2,$3,$4,'PLAYER',$5)", [id, data.name, data.email, passwordHash, teamId]);
    } catch (e) {
      if (data.joinCode === "" || !data.joinCode) await query("DELETE FROM teams WHERE id=$1", [teamId]).catch(() => undefined);
      throw e;
    }
    const user = await query<{name:string;email:string;role:"PLAYER";team_id:string}>("SELECT name,email,role,team_id FROM users WHERE id=$1", [id]);
    await createSession({ id, name: user.rows[0].name, email: user.rows[0].email, role: user.rows[0].role, teamId: user.rows[0].team_id });
    return Response.json({ ok: true, user: { id, name: user.rows[0].name, email: user.rows[0].email, role: "PLAYER", teamId } }, { status: 201 });
  } catch (e) { return errorResponse(e); }
}
