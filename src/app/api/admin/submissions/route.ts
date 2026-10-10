import { requireAdmin, authErrorResponse } from "@/lib/auth";
import { query } from "@/lib/db";
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url=new URL(request.url); const n=url.searchParams.get("chapter");
    const values:unknown[]=[];let where="";if(n){const num=Number(n);if(!Number.isInteger(num)||num<1||num>10)return Response.json({error:"الدور غير صحيح."},{status:400});values.push(num);where="WHERE s.chapter_id=$1";}
    const result=await query<any>(`SELECT s.id,s.chapter_id AS "chapterId",c.title AS "chapterTitle",t.name AS "teamName",t.join_code AS "joinCode",
      u.name AS "submittedBy",u.email AS "submittedByEmail",s.answer,s.attempt_count AS "attemptCount",s.created_at AS "firstSubmittedAt",s.answer_updated_at AS "lastSubmittedAt",
      s.correct_score AS "correctScore",s.reasoning_score AS "reasoningScore",s.speed_bonus AS "speedBonus",s.published,s.admin_feedback AS "feedback",
      COALESCE(h.count,0)::int AS "hintsUsed", COALESCE(h.count,0)::int*10 AS "hintPenalty",
      GREATEST(0,s.correct_score+s.reasoning_score+s.speed_bonus-COALESCE(h.count,0)::int*10) AS "finalScore"
      FROM submissions s JOIN chapters c ON c.id=s.chapter_id JOIN teams t ON t.id=s.team_id JOIN users u ON u.id=s.submitted_by
      LEFT JOIN LATERAL(SELECT count(*) AS count FROM hint_usage hu WHERE hu.team_id=s.team_id AND hu.chapter_id=s.chapter_id) h ON true
      ${where} ORDER BY s.chapter_id, s.updated_at DESC`,values);
    return Response.json({submissions:result.rows});
  }catch(e){return authErrorResponse(e);}
}
