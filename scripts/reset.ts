import pg from "pg";
const { Pool } = pg;
if (process.env.CONFIRM_DB_RESET !== "YES") {
  console.error("للحذف الفعلي، أضف CONFIRM_DB_RESET=YES إلى الأمر. العملية تحذف كل حسابات اللعبة والإجابات.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL مطلوب.");
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined });
await pool.query("DROP TABLE IF EXISTS audit_logs, hint_usage, submissions, chapters, game_settings, users, teams CASCADE");
await pool.end();
console.log("حُذفت جداول اللعبة. شغّل npm run db:setup لإعادة إنشائها.");
