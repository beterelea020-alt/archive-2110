import { z } from "zod";
import { requireAdmin, authErrorResponse } from "@/lib/auth";
import { query } from "@/lib/db";
import { errorResponse } from "@/lib/http";
const schema=z.object({correctScore:z.number().int().min(0).max(100),reasoningScore:z.number().int().min(0).max(50),feedback:z.string().max(2500).optional().default(""),published:z.boolean()});
export async function PATCH(request:Request,context:{params:Promise<{id:string}>}){
  try{
    const admin=await requireAdmin();const {id}=await context.params;const data=schema.parse(await request.json());
    const found=await query<any>(`SELECT s.id,s.answer_updated_at,c.opened_at,gs.speed_bonus_enabled FROM submissions s JOIN chapters c ON c.id=s.chapter_id CROSS JOIN game_settings gs WHERE s.id=$1`,[id]);
    const row=found.rows[0];if(!row)return Response.json({error:"الإجابة غير موجودة."},{status:404});
    const speed=await query<{bonus:number}>(`SELECT CASE WHEN $3::boolean AND $2::timestamptz IS NOT NULL AND $1::timestamptz >= $2::timestamptz AND $1::timestamptz <= $2::timestamptz+interval '15 minutes' THEN 5 ELSE 0 END AS bonus`,[row.answer_updated_at,row.opened_at,row.speed_bonus_enabled]);
    const res=await query(`UPDATE submissions SET correct_score=$1,reasoning_score=$2,speed_bonus=$3,admin_feedback=$4,published=$5,updated_at=now() WHERE id=$6`,[data.correctScore,data.reasoningScore,speed.rows[0].bonus,data.feedback,data.published,id]);
    await query("INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,details) VALUES($1,'submission_graded','submission',$2,$3)",[admin.id,id,JSON.stringify({correctScore:data.correctScore,reasoningScore:data.reasoningScore,published:data.published})]);
    return Response.json({ok:true,message:"تم حفظ التصحيح.",speedBonus:speed.rows[0].bonus});
  }catch(e){return errorResponse(e);}
}
