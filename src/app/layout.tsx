import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { SiteHeader } from "@/components/site-header";
import Link from "next/link";
export const metadata:Metadata={title:"الأرشيف 21:10 — لعبة التحقيق النفسي",description:"لعبة تحقيق تفاعلية من عشرة أدوار. كل تسجيل شاهد؛ ليس كل شاهد يقول الحقيقة.",applicationName:"الأرشيف 21:10",robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ar" dir="rtl"><body><AuthProvider><div className="app-shell"><SiteHeader/>{children}<footer className="footer"><div className="container footer-inner"><div className="brand"><span className="brand-mark">21:10</span><span>الأرشيف<small>CASE FILE / 17-B</small></span></div><small>قصة خيالية بالكامل — جميع الشخصيات والأماكن والأحداث من وحي الخيال.</small><small>نسخة تجريبية 1.0 · توقيت القاهرة Africa/Cairo</small></div></footer></div></AuthProvider></body></html>}
