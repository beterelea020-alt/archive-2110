import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { errorResponse } from "@/lib/http";
export async function GET() {
  try {
    const user = await requireUser();
    const isAdmin = user.role === "ADMIN";
    // اللاعب يشوف الدور بس لو الأدمن فتحه. الأدمن يشوف كل الأدوار كاملة (معاينة).
    const result = await query<any>(`
      SELECT c.id, c.title, c.state,
        ($2::boolean OR c.state IN ('OPEN','CLOSED')) AS opened,
        (c.state = 'CLOSED') AS closed,
        CASE WHEN $2::boolean OR c.state IN ('OPEN','CLOSED') THEN c.content ELSE NULL END AS content,
        s.id AS "submissionId", s.answer AS "myAnswer", s.answer_updated_at AS "submittedAt", s.published, CASE WHEN s.published THEN s.admin_feedback ELSE NULL END AS "feedback",
        CASE WHEN s.published THEN GREATEST(0, s.correct_score + s.reasoning_score + s.speed_bonus - COALESCE(hu.penalty,0)) ELSE NULL END AS "score",
        COALESCE(hu.penalty,0)/10 AS "hintsUsed"
      FROM chapters c
      LEFT JOIN submissions s ON s.chapter_id=c.id AND s.team_id=$1
      LEFT JOIN LATERAL (SELECT count(*)::int * 10 AS penalty FROM hint_usage WHERE team_id=$1 AND chapter_id=c.id) hu ON true
      ORDER BY c.id ASC`, [user.teamId, isAdmin]);
    return Response.json({ chapters: result.rows, isAdmin });
  } catch (e) { return errorResponse(e); }
}
