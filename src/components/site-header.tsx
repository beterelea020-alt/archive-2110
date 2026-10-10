"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArrowUpRight, LogOut, Menu } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useState } from "react";
export function SiteHeader(){
 const {user,loading,logout}=useAuth();const router=useRouter();const [menu,setMenu]=useState(false);
 async function signOut(){await logout();router.push("/");router.refresh();}
 return <header className="topbar"><div className="container topbar-inner">
  <Link href="/" className="brand"><span className="brand-mark">21:10</span><span>الأرشيف<small>CASE FILE / 17-B</small></span></Link>
  <nav className={`nav-links ${menu?"show":""}`}><Link href="/dashboard">ملف التحقيق</Link><Link href="/leaderboard">ترتيب الفرق</Link>{user?.role==="ADMIN"&&<Link href="/admin">لوحة الإدارة</Link>}</nav>
  <div className="nav-actions">{loading?null:user?<><span className="small muted" style={{maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name}</span><button className="btn btn-outline btn-sm" onClick={signOut}><LogOut size={14}/> خروج</button></>:<><Link className="btn btn-outline btn-sm" href="/login">تسجيل الدخول</Link><Link className="btn btn-primary btn-sm" href="/register">ابدأ التحقيق <ArrowUpRight size={14}/></Link></>}<button className="btn btn-ghost btn-sm mobile-menu" aria-label="القائمة" onClick={()=>setMenu(!menu)}><Menu size={18}/></button></div>
 </div></header>
}
