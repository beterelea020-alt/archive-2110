import { z } from "zod";
import { requireAdmin, authErrorResponse } from "@/lib/auth";
import { pool, query } from "@/lib/db";
import { errorResponse } from "@/lib/http";
const schema = z.object({
  gameDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  speedBonusEnabled: z.boolean().default(false),
  rounds: z.array(z.object({ id: z.number().int().min(1).max(10), opensAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), closesAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/) })).length(10)
});
export async function GET() {
  try {
    await requireAdmin();
    const result = await query<any>(`SELECT gs.game_date::text AS "gameDate", gs.speed_bonus_enabled AS "speedBonusEnabled", c.id, c.title, to_char(c.opens_at,'HH24:MI') AS "opensAt", to_char(c.closes_at,'HH24:MI') AS "closesAt"
      FROM game_settings gs CROSS JOIN chapters c ORDER BY c.id`);
    return Response.json({ gameDate: result.rows[0]?.gameDate, rounds: result.rows });
  } catch (e) { return authErrorResponse(e); }
}
export async function PATCH(request: Request) {
  const client = await pool.connect();
  try {
    const admin = await requireAdmin();
    const data = schema.parse(await request.json());
    const sorted = [...data.rounds].sort((a,b)=>a.id-b.id);
    if(new Set(sorted.map(r=>r.id)).size!==10 || sorted.some((r,i)=>r.id!==i+1)) return Response.json({error:"يجب إرسال الأدوار العشرة بالترتيب."},{status:400});
    const mins=(x:string)=>Number(x.slice(0,2))*60+Number(x.slice(3,5));
    for(let i=0;i<sorted.length;i++){
      if(mins(sorted[i].opensAt)>=mins(sorted[i].closesAt)) return Response.json({error:`موعد إغلاق الدور ${i+1} يجب أن يأتي بعد فتحه.`},{status:400});
      if(i && mins(sorted[i].opensAt)<=mins(sorted[i-1].closesAt)) return Response.json({error:`موعد فتح الدور ${i+1} يجب أن يكون بعد إغلاق الدور السابق.`},{status:400});
    }
    const d=new Date(`${data.gameDate}T12:00:00Z`);if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==data.gameDate)return Response.json({error:"تاريخ اللعبة غير صحيح."},{status:400});
    await client.query("BEGIN");
    await client.query("UPDATE game_settings SET game_date=$1,speed_bonus_enabled=$2,updated_at=now() WHERE id=1",[data.gameDate,data.speedBonusEnabled]);
    for(const r of sorted) await client.query("UPDATE chapters SET opens_at=$1::time,closes_at=$2::time,updated_at=now() WHERE id=$3",[r.opensAt,r.closesAt,r.id]);
    await client.query(`UPDATE submissions s SET speed_bonus=CASE
      WHEN gs.speed_bonus_enabled AND s.answer_updated_at >= ((gs.game_date+c.opens_at) AT TIME ZONE 'Africa/Cairo')
       AND s.answer_updated_at <= ((gs.game_date+c.opens_at) AT TIME ZONE 'Africa/Cairo')+interval '15 minutes'
      THEN 5 ELSE 0 END
      FROM chapters c CROSS JOIN game_settings gs WHERE s.chapter_id=c.id`);
    await client.query("INSERT INTO audit_logs(actor_id,action,entity_type,details) VALUES($1,'schedule_updated','game',$2)",[admin.id,JSON.stringify({gameDate:data.gameDate,speedBonusEnabled:data.speedBonusEnabled,rounds:data.rounds})]);
    await client.query("COMMIT");
    return Response.json({ok:true,message:"تم حفظ جدول اللعبة بتوقيت القاهرة."});
  } catch (e) { await client.query("ROLLBACK").catch(()=>undefined); return errorResponse(e); }
  finally { client.release(); }
}
