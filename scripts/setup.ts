import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import pg from "pg";
import { randomUUID, randomBytes } from "node:crypto";
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL غير مضبوط. انسخ .env.example إلى .env واضبط اتصال PostgreSQL.");
  process.exit(1);
}
const pool = new Pool({ connectionString, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined });
const chapters = JSON.parse(await readFile(resolve("src/data/chapters.json"), "utf8")) as Array<{number:number; title:string; content:string}>;
const hints = JSON.parse(await readFile(resolve("private/round-hints.json"), "utf8")) as Array<{number:number; hint1:string; hint2:string}>;
const schedule = [ ["09:00","09:55"], ["10:00","10:55"], ["11:00","11:55"], ["12:00","12:55"], ["13:00","13:55"], ["14:00","14:55"], ["15:00","15:55"], ["16:00","16:55"], ["17:00","17:55"], ["18:00","18:55"] ];
try {
  await pool.query(`CREATE TABLE IF NOT EXISTS teams (
    id uuid PRIMARY KEY, name text NOT NULL, join_code text UNIQUE NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY, name text NOT NULL, email text UNIQUE NOT NULL,
    password_hash text NOT NULL, role text NOT NULL DEFAULT 'PLAYER' CHECK (role IN ('PLAYER','ADMIN')),
    team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS game_settings (
    id integer PRIMARY KEY CHECK (id = 1), game_date date NOT NULL, speed_bonus_enabled boolean NOT NULL DEFAULT false,
    game_title text NOT NULL DEFAULT 'الأرشيف 21:10', updated_at timestamptz NOT NULL DEFAULT now()
  )`);
  await pool.query("ALTER TABLE game_settings ADD COLUMN IF NOT EXISTS speed_bonus_enabled boolean NOT NULL DEFAULT false");
  await pool.query(`CREATE TABLE IF NOT EXISTS chapters (
    id integer PRIMARY KEY, title text NOT NULL, content text NOT NULL,
    hint_one text NOT NULL, hint_two text NOT NULL,
    opens_at time NOT NULL, closes_at time NOT NULL, active boolean NOT NULL DEFAULT true,
    updated_at timestamptz NOT NULL DEFAULT now(), CHECK (opens_at < closes_at)
  )`);
  await pool.query("ALTER TABLE chapters ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT 'LOCKED'");
  await pool.query("ALTER TABLE chapters ADD COLUMN IF NOT EXISTS opened_at timestamptz");
  await pool.query("ALTER TABLE chapters DROP CONSTRAINT IF EXISTS chapters_state_check");
  await pool.query("ALTER TABLE chapters ADD CONSTRAINT chapters_state_check CHECK (state IN ('LOCKED','OPEN','CLOSED'))");
  await pool.query(`CREATE TABLE IF NOT EXISTS submissions (
    id uuid PRIMARY KEY, chapter_id integer NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    submitted_by uuid NOT NULL REFERENCES users(id), answer text NOT NULL,
    attempt_count integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), answer_updated_at timestamptz NOT NULL DEFAULT now(),
    correct_score integer NOT NULL DEFAULT 0 CHECK (correct_score BETWEEN 0 AND 100),
    reasoning_score integer NOT NULL DEFAULT 0 CHECK (reasoning_score BETWEEN 0 AND 50),
    speed_bonus integer NOT NULL DEFAULT 0 CHECK (speed_bonus BETWEEN 0 AND 5),
    published boolean NOT NULL DEFAULT false, admin_feedback text,
    UNIQUE(chapter_id, team_id)
  )`);
  await pool.query("ALTER TABLE submissions ADD COLUMN IF NOT EXISTS answer_updated_at timestamptz NOT NULL DEFAULT now()");
  await pool.query("ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_speed_bonus_check");
  await pool.query("ALTER TABLE submissions ADD CONSTRAINT submissions_speed_bonus_check CHECK (speed_bonus BETWEEN 0 AND 5)");
  await pool.query(`CREATE TABLE IF NOT EXISTS hint_usage (
    team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    chapter_id integer NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    hint_no integer NOT NULL CHECK (hint_no IN (1,2)), used_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(team_id, chapter_id, hint_no)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS admin_guides (
    id integer PRIMARY KEY CHECK (id = 1), content text NOT NULL, uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at timestamptz NOT NULL DEFAULT now()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS audit_logs (
    id bigserial PRIMARY KEY, actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
    action text NOT NULL, entity_type text NOT NULL, entity_id text,
    details jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
  )`);

  const gameDate = process.env.GAME_DATE || "2026-11-01";
  await pool.query(`INSERT INTO game_settings (id, game_date, game_title) VALUES (1, $1, 'الأرشيف 21:10') ON CONFLICT (id) DO NOTHING`, [gameDate]);
  for (const c of chapters) {
    const [open, close] = schedule[c.number - 1];
    const h = hints.find(item => item.number === c.number);
    if (!h) throw new Error(`التلميحات السرية للدور ${c.number} غير موجودة.`);
    await pool.query(`INSERT INTO chapters (id,title,content,hint_one,hint_two,opens_at,closes_at,active)
      VALUES ($1,$2,$3,$4,$5,$6,$7,true)
      ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, content=EXCLUDED.content,
      hint_one=EXCLUDED.hint_one, hint_two=EXCLUDED.hint_two, updated_at=now()`,
      [c.number, c.title, c.content, h.hint1, h.hint2, open, close]);
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    if (adminPassword.length < 12) throw new Error("ADMIN_PASSWORD يجب أن يحتوي على 12 حرفًا على الأقل.");
    const adminId = randomUUID();
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await pool.query(`INSERT INTO users (id,name,email,password_hash,role,team_id)
      VALUES ($1,'مدير اللعبة',$2,$3,'ADMIN',NULL)
      ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash, role='ADMIN'`, [adminId, adminEmail, passwordHash]);
    console.log(`تم تجهيز حساب الإدارة: ${adminEmail}`);
  } else {
    console.warn("لم يتم إنشاء حساب إدارة. أضف ADMIN_EMAIL وADMIN_PASSWORD إلى .env ثم أعد npm run db:setup.");
  }
  console.log(`تم تجهيز قاعدة البيانات وزراعة ${chapters.length} فصول بموعد افتراضي ${gameDate}.`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally { await pool.end(); }
