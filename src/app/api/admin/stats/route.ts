import { requireAdmin, authErrorResponse } from "@/lib/auth";
import { query } from "@/lib/db";
export async function GET(){
  try{await requireAdmin();
    const [users,teams,subs,published,rounds]=await Promise.all([
      query<{count:number}>("SELECT count(*)::int AS count FROM users WHERE role='PLAYER'"),
      query<{count:number}>("SELECT count(*)::int AS count FROM teams"),
      query<{count:number}>("SELECT count(*)::int AS count FROM submissions"),
      query<{count:number}>("SELECT count(*)::int AS count FROM submissions WHERE published=true"),
      query<any>(`SELECT id,title,to_char(opens_at,'HH24:MI') AS "opensAt",to_char(closes_at,'HH24:MI') AS "closesAt",active FROM chapters ORDER BY id`)
    ]);
    return Response.json({players:users.rows[0].count,teams:teams.rows[0].count,submissions:subs.rows[0].count,publishedScores:published.rows[0].count,rounds:rounds.rows});
  }catch(e){return authErrorResponse(e);}
}
