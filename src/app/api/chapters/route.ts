import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { errorResponse } from "@/lib/http";
export async function GET() {
  try {
    const user = await requireUser();
    const result = await query<any>(`
      SELECT c.id, c.title, to_char(c.opens_at,'HH24:MI') AS "opensAt", to_char(c.closes_at,'HH24:MI') AS "closesAt",
        gs.game_date::text AS "gameDate",
        (now() >= ((gs.game_date + c.opens_at) AT TIME ZONE 'Africa/Cairo') AND c.active) AS opened,
        (now() >= ((gs.game_date + c.closes_at) AT TIME ZONE 'Africa/Cairo')) AS closed,
        CASE WHEN now() >= ((gs.game_date + c.opens_at) AT TIME ZONE 'Africa/Cairo') AND c.active THEN c.content ELSE NULL END AS content,
        s.id AS "submissionId", s.answer AS "myAnswer", s.answer_updated_at AS "submittedAt", s.published, CASE WHEN s.published THEN s.admin_feedback ELSE NULL END AS "feedback",
        CASE WHEN s.published THEN GREATEST(0, s.correct_score + s.reasoning_score + s.speed_bonus - COALESCE(hu.penalty,0)) ELSE NULL END AS "score",
        COALESCE(hu.penalty,0)/10 AS "hintsUsed"
      FROM chapters c CROSS JOIN game_settings gs
      LEFT JOIN submissions s ON s.chapter_id=c.id AND s.team_id=$1
      LEFT JOIN LATERAL (SELECT count(*)::int * 10 AS penalty FROM hint_usage WHERE team_id=$1 AND chapter_id=c.id) hu ON true
      ORDER BY c.id ASC`, [user.teamId]);
    return Response.json({ chapters: result.rows, gameDate: result.rows[0]?.gameDate ?? null, timezone: "Africa/Cairo" });
  } catch (e) { return errorResponse(e); }
}
