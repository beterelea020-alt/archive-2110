import { Pool, type QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var archivePool: Pool | undefined;
}

const ssl = process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined;
const isProduction = process.env.NODE_ENV === "production";
const requestedPoolMax = Number(process.env.DB_POOL_MAX ?? (isProduction ? "1" : "10"));
const poolMax = Number.isInteger(requestedPoolMax) && requestedPoolMax > 0
  ? Math.min(requestedPoolMax, 10)
  : (isProduction ? 1 : 10);
export const pool = globalThis.archivePool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
  // Vercel/serverless should use a small client pool and Supabase's transaction pooler.
  max: poolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000
});
if (process.env.NODE_ENV !== "production") globalThis.archivePool = pool;

let migration: Promise<void> | null = null;
// يضيف أعمدة التحكم اليدوي (state / opened_at) تلقائيًا لو مش موجودة، فمفيش داعي لتشغيل أي أمر يدوي.
function ensureMigrated() {
  if (!migration) {
    migration = (async () => {
      const col = await pool.query("SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='chapters' AND column_name IN ('state','opened_at')");
      if (col.rowCount === 2) return;
      const exists = await pool.query("SELECT 1 FROM information_schema.tables WHERE table_schema=current_schema() AND table_name='chapters'");
      if (!exists.rowCount) return;
      await pool.query("ALTER TABLE chapters ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT 'LOCKED' CHECK (state IN ('LOCKED','OPEN','CLOSED')), ADD COLUMN IF NOT EXISTS opened_at timestamptz");
    })().catch((e) => { console.error("migration failed", e); migration = null; });
  }
  return migration;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL غير مضبوط في ملف البيئة.");
  await ensureMigrated();
  return pool.query<T>(text, values);
}
