import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { errorResponse } from "@/lib/http";
export async function GET(){
  try{
    await requireUser();
    const result=await query<any>(`WITH scores AS (
      SELECT t.id,t.name AS "teamName",t.join_code AS "joinCode",count(s.id)::int AS "gradedRounds",
        COALESCE(sum(GREATEST(0,s.correct_score+s.reasoning_score+s.speed_bonus-COALESCE(h.penalty,0))),0)::int AS score,
        COALESCE(sum(s.reasoning_score) FILTER (WHERE s.id IS NOT NULL),0)::int AS "reasoningTotal",
        COALESCE(max(CASE WHEN s.chapter_id=10 THEN GREATEST(0,s.correct_score+s.reasoning_score+s.speed_bonus-COALESCE(h.penalty,0)) ELSE NULL END),0)::int AS "finalRoundScore",
        count(s.id) FILTER (WHERE s.correct_score=100)::int AS "fullCorrectRounds"
      FROM teams t LEFT JOIN submissions s ON s.team_id=t.id AND s.published=true
      LEFT JOIN LATERAL(SELECT count(*)::int*10 AS penalty FROM hint_usage WHERE team_id=t.id AND chapter_id=s.chapter_id) h ON true
      GROUP BY t.id
    ) SELECT scores.*, RANK() OVER(ORDER BY score DESC,"reasoningTotal" DESC,"finalRoundScore" DESC,"fullCorrectRounds" DESC)::int AS rank
      FROM scores WHERE "gradedRounds" > 0 ORDER BY score DESC,"reasoningTotal" DESC,"finalRoundScore" DESC,"fullCorrectRounds" DESC LIMIT 100`);
    return Response.json({teams:result.rows});
  }catch(e){return errorResponse(e);}
}
