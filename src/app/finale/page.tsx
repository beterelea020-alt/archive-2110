"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Github, Globe, Instagram, Linkedin, MessageCircle } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { owner } from "@/data/owner";

const lines = [
  "أهلاً أهلاً! خلصتوا العشر أدوار كلهم 👏",
  "أنا " + owner.name + "، صاحب الأرشيف 21:10 😄",
  "الخبر الحلو: مفيش مكسب.. ومفيش خسارة!",
  "إنتوا كنتوا بتلعبوا عشان تسلّوا نفسكم، ولا أقل ولا أكتر 😂",
  "يوم حلو خلاص كده.. كل سنة وانتم طيبين! يلا بينا 🎉"
];
const icons: Record<string, React.ReactNode> = {
  linkedin: <Linkedin size={16} />, instagram: <Instagram size={16} />, whatsapp: <MessageCircle size={16} />, github: <Github size={16} />, portfolio: <Globe size={16} />
};

export default function FinalePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [shown, setShown] = useState(0);
  const [photoOk, setPhotoOk] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    (async () => {
      try {
        const r = await fetch("/api/chapters", { cache: "no-store" });
        const d = await r.json();
        const all = Array.isArray(d.chapters) && d.chapters.length === 10 && d.chapters.every((c: any) => c.submissionId);
        if (r.ok && (d.isAdmin || all)) setReady(true); else router.replace("/dashboard");
      } catch { router.replace("/dashboard"); }
    })();
  }, [loading, user, router]);

  useEffect(() => {
    if (!ready) return;
    const t = setInterval(() => setShown((n) => (n < lines.length ? n + 1 : n)), 1900);
    setShown(1);
    return () => clearInterval(t);
  }, [ready]);

  if (!ready) return <main className="page-main"><div className="container loading-state"><div className="spinner" /></div></main>;
  const links = owner.links.filter((l) => l.url);
  const done = shown >= lines.length;
  return (
    <main className="page-main">
      <style>{`
        .fin-wrap{max-width:640px;margin:0 auto;text-align:center}
        .fin-avatar{position:relative;width:170px;height:170px;margin:6px auto 4px}
        .fin-avatar img,.fin-fallback{width:170px;height:170px;border-radius:50%;object-fit:cover;border:4px solid var(--ink);box-shadow:var(--shadow);background:var(--paper-2)}
        .fin-fallback{display:grid;place-items:center;font-size:54px;font-weight:900;color:var(--paper-2);background:var(--ink)}
        .fin-hand{position:absolute;left:-18px;bottom:6px;font-size:52px;transform-origin:70% 80%;animation:finwave 1.3s ease-in-out infinite}
        @keyframes finwave{0%,60%,100%{transform:rotate(0)}10%{transform:rotate(16deg)}20%{transform:rotate(-10deg)}30%{transform:rotate(16deg)}40%{transform:rotate(-6deg)}50%{transform:rotate(10deg)}}
        .fin-talk{display:flex;gap:3px;justify-content:center;height:18px;margin:8px 0 14px}
        .fin-talk i{width:4px;border-radius:3px;background:var(--red);display:block;animation:fintalk .6s ease-in-out infinite}
        .fin-talk i:nth-child(2){animation-delay:.1s}.fin-talk i:nth-child(3){animation-delay:.2s}.fin-talk i:nth-child(4){animation-delay:.3s}.fin-talk i:nth-child(5){animation-delay:.15s}
        @keyframes fintalk{0%,100%{height:5px}50%{height:18px}}
        .fin-talk.off i{animation:none;height:4px;opacity:.35}
        .fin-bubbles{display:grid;gap:10px;text-align:right}
        .fin-bubble{background:var(--paper-2);border:1px solid var(--line);border-radius:14px 14px 14px 4px;padding:12px 16px;font-size:15px;line-height:1.9;font-weight:700;box-shadow:0 6px 20px rgba(18,28,42,.04);animation:finpop .35s ease-out}
        .fin-bubble:last-child.big{background:var(--ink);color:#fff;border-color:var(--ink)}
        @keyframes finpop{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:none}}
        .fin-links{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:16px}
      `}</style>
      <div className="container">
        <div className="fin-wrap">
          <div className="eyebrow" style={{ color: "var(--red)" }}>CASE CLOSED / 17-B</div>
          <div className="fin-avatar">
            {photoOk ? <img src={owner.photo} alt={owner.name} onError={() => setPhotoOk(false)} /> : <div className="fin-fallback">PE</div>}
            <span className="fin-hand" aria-hidden>👋</span>
          </div>
          <div className={`fin-talk ${done ? "off" : ""}`} aria-hidden><i /><i /><i /><i /><i /></div>
          <div className="fin-bubbles">
            {lines.slice(0, shown).map((t, i) => <div key={i} className={`fin-bubble ${i === lines.length - 1 ? "big" : ""}`}>{t}</div>)}
          </div>
          {done && (
            <div className="panel" style={{ marginTop: 22, animation: "finpop .4s ease-out" }}>
              <div className="panel-title" style={{ justifyContent: "center", marginBottom: 6 }}><h2>تحب تشوف شغلي أو تكلمني؟</h2></div>
              <p className="field-help" style={{ margin: 0 }}>{owner.tagline} · لو عندك فكرة أو موقع أو تطبيق، كلمني</p>
              {links.length > 0 && (
                <div className="fin-links">
                  {links.map((l) => (
                    <a key={l.key} className="btn btn-dark" href={l.url} target="_blank" rel="noopener noreferrer">{icons[l.key]} {l.label}</a>
                  ))}
                </div>
              )}
            </div>
          )}
          <div style={{ marginTop: 22 }}><Link href="/dashboard" className="btn btn-ghost btn-sm"><ArrowRight size={14} /> رجوع للوحة التحقيق</Link></div>
        </div>
      </div>
    </main>
  );
}
