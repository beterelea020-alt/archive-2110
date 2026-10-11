import { z } from "zod";
import { requireAdmin, authErrorResponse, AuthError } from "@/lib/auth";
import { query } from "@/lib/db";
import { errorResponse } from "@/lib/http";

const schema = z.object({
  speedBonusEnabled: z.boolean().optional(),
  ids: z.array(z.number().int().min(1).max(10)).min(1).max(10).optional(),
  state: z.enum(["OPEN", "CLOSED", "LOCKED"]).optional()
});

const SPEED_SQL = `UPDATE submissions s SET speed_bonus=CASE
  WHEN gs.speed_bonus_enabled AND c.opened_at IS NOT NULL AND s.answer_updated_at >= c.opened_at
   AND s.answer_updated_at <= c.opened_at + interval '15 minutes' THEN 5 ELSE 0 END
  FROM chapters c CROSS JOIN game_settings gs WHERE s.chapter_id=c.id`;

export async function GET() {
  try {
    await requireAdmin();
    const rounds = await query<any>(`SELECT c.id, c.title, c.state, c.opened_at AS "openedAt",
        (SELECT count(*)::int FROM submissions s WHERE s.chapter_id=c.id) AS "submissions"
      FROM chapters c ORDER BY c.id`);
    const gs = await query<any>(`SELECT speed_bonus_enabled AS "speedBonusEnabled" FROM game_settings WHERE id=1`);
    return Response.json({ speedBonusEnabled: !!gs.rows[0]?.speedBonusEnabled, rounds: rounds.rows });
  } catch (e) {
    if (e instanceof AuthError) return authErrorResponse(e);
    console.error(e);
    return Response.json({ error: "خطأ في قاعدة البيانات: " + (e instanceof Error ? e.message : String(e)) }, { status: 500 });
  }
}

// الأدمن هو اللي بيفتح ويقفل: OPEN = مفتوح للإجابة، CLOSED = ظاهر بس الإجابات اتقفلت، LOCKED = مخفي عن اللاعبين.
export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const data = schema.parse(await request.json());
    let message = "تم الحفظ.";
    if (typeof data.speedBonusEnabled === "boolean") {
      await query("UPDATE game_settings SET speed_bonus_enabled=$1, updated_at=now() WHERE id=1", [data.speedBonusEnabled]);
      message = data.speedBonusEnabled ? "تم تفعيل مكافأة السرعة." : "تم إيقاف مكافأة السرعة.";
    }
    if (data.ids && data.state) {
      if (data.state === "OPEN") {
        await query("UPDATE chapters SET state='OPEN', opened_at=COALESCE(opened_at, now()), updated_at=now() WHERE id=ANY($1::int[]) AND state<>'OPEN'", [data.ids]);
        message = data.ids.length > 1 ? "تم فتح الأدوار المحددة للاعبين." : `تم فتح الدور ${data.ids[0]} للاعبين.`;
      } else if (data.state === "CLOSED") {
        await query("UPDATE chapters SET state='CLOSED', updated_at=now() WHERE id=ANY($1::int[]) AND state='OPEN'", [data.ids]);
        message = data.ids.length > 1 ? "تم إغلاق استلام الإجابات في الأدوار المفتوحة." : `تم إغلاق استلام الإجابات في الدور ${data.ids[0]}.`;
      } else {
        await query("UPDATE chapters SET state='LOCKED', opened_at=NULL, updated_at=now() WHERE id=ANY($1::int[])", [data.ids]);
        message = data.ids.length > 1 ? "تم قفل الأدوار المحددة وإخفاؤها عن اللاعبين." : `تم قفل الدور ${data.ids[0]} وإخفاؤه عن اللاعبين.`;
      }
    }
    await query(SPEED_SQL);
    await query("INSERT INTO audit_logs(actor_id,action,entity_type,details) VALUES($1,'rounds_state_changed','game',$2)", [admin.id, JSON.stringify(data)]);
    return Response.json({ ok: true, message });
  } catch (e) { return errorResponse(e); }
}
