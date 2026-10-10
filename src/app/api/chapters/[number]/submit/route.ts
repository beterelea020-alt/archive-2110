import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { errorResponse } from "@/lib/http";
const schema = z.object({ answer: z.string().trim().min(10, "الإجابة قصيرة جدًا؛ أضف تفسيرك والأدلة التي اعتمدت عليها.").max(12000) });
export async function POST(request: Request, context: { params: Promise<{number:string}> }) {
  try {
    const user = await requireUser();
    if (!user.teamId) return Response.json({ error: "حسابك غير مرتبط بفريق." }, { status: 400 });
    const { number } = await context.params; const chapter = Number(number);
    if (!Number.isInteger(chapter) || chapter < 1 || chapter > 10) return Response.json({ error: "رقم الدور غير صحيح." }, { status: 404 });
    const { answer } = schema.parse(await request.json());
    const status = await query<{opened:boolean;closed:boolean;title:string}>(`
      SELECT c.title, c.active AND now() >= ((gs.game_date + c.opens_at) AT TIME ZONE 'Africa/Cairo') AS opened,
        now() >= ((gs.game_date + c.closes_at) AT TIME ZONE 'Africa/Cairo') AS closed
      FROM chapters c CROSS JOIN game_settings gs WHERE c.id=$1`, [chapter]);
    const s = status.rows[0];
    if (!s) return Response.json({ error: "الدور غير موجود." }, { status: 404 });
    if (!s.opened) return Response.json({ error: "هذا الدور لم يُفتح بعد حسب جدول القاهرة." }, { status: 403 });
    if (s.closed) return Response.json({ error: "انتهت مهلة إرسال الإجابة لهذا الدور." }, { status: 403 });
    const existing = await query<{id:string}>("SELECT id FROM submissions WHERE chapter_id=$1 AND team_id=$2", [chapter, user.teamId]);
    const id = existing.rows[0]?.id ?? randomUUID();
    await query(`INSERT INTO submissions(id,chapter_id,team_id,submitted_by,answer) VALUES($1,$2,$3,$4,$5)
      ON CONFLICT (chapter_id,team_id) DO UPDATE SET answer=EXCLUDED.answer, submitted_by=EXCLUDED.submitted_by,
        attempt_count=submissions.attempt_count+1, updated_at=now(), answer_updated_at=now(), published=false`, [id, chapter, user.teamId, user.id, answer]);
    await query("INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,details) VALUES($1,'submission_saved','submission',$2,$3)", [user.id, id, JSON.stringify({chapter, teamId:user.teamId})]);
    return Response.json({ ok: true, message: "تم حفظ آخر إجابة للفريق. يمكن تعديلها قبل إغلاق الدور." });
  } catch (e) { return errorResponse(e); }
}
