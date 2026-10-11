import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { errorResponse } from "@/lib/http";
const schema = z.object({ hintNo: z.number().int().min(1).max(2) });
export async function POST(request: Request, context: { params: Promise<{number:string}> }) {
  try {
    const user = await requireUser();
    if (!user.teamId) return Response.json({error:"حسابك غير مرتبط بفريق."},{status:400});
    const {number}=await context.params; const chapter=Number(number);
    if(!Number.isInteger(chapter)||chapter<1||chapter>10) return Response.json({error:"الدور غير موجود."},{status:404});
    const {hintNo}=schema.parse(await request.json());
    const status=await query<{state:string}>("SELECT state FROM chapters WHERE id=$1",[chapter]);
    const st=status.rows[0]?.state;
    if(st!=="OPEN"&&st!=="CLOSED") return Response.json({error:"التلميح غير متاح قبل ما المدير يفتح الدور."},{status:403});
    if(st==="CLOSED") return Response.json({error:"المدير أغلق هذا الدور ولا يمكن استخدام التلميحات."},{status:403});
    if(hintNo===2){const first=await query("SELECT 1 FROM hint_usage WHERE team_id=$1 AND chapter_id=$2 AND hint_no=1",[user.teamId,chapter]);if(!first.rowCount)return Response.json({error:"افتح التلميح الأول قبل الثاني."},{status:400});}
    await query("INSERT INTO hint_usage(team_id,chapter_id,hint_no) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",[user.teamId,chapter,hintNo]);
    const hint=await query<{hint:string}>(`SELECT CASE WHEN $2=1 THEN hint_one ELSE hint_two END AS hint FROM chapters WHERE id=$1`,[chapter,hintNo]);
    const count=await query<{count:number}>("SELECT count(*)::int AS count FROM hint_usage WHERE team_id=$1 AND chapter_id=$2",[user.teamId,chapter]);
    return Response.json({hint:hint.rows[0].hint,usedHints:count.rows[0].count,penalty:count.rows[0].count*10});
  }catch(e){return errorResponse(e);}
}
