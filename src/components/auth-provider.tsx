"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
export type AppUser = { id:string; name:string; email:string; role:"PLAYER"|"ADMIN"; teamId:string|null; teamName?:string|null; joinCode?:string|null };
type AuthValue = { user:AppUser|null; loading:boolean; refresh:()=>Promise<AppUser|null>; logout:()=>Promise<void> };
const AuthContext=createContext<AuthValue>({user:null,loading:true,refresh:async()=>null,logout:async()=>{}});
export function AuthProvider({children}:{children:React.ReactNode}){
  const [user,setUser]=useState<AppUser|null>(null);const [loading,setLoading]=useState(true);
  const refresh=useCallback(async()=>{try{const r=await fetch("/api/auth/me",{cache:"no-store"});const d=await r.json();setUser(d.user??null);return d.user??null;}catch{return null;}finally{setLoading(false);}},[]);
  useEffect(()=>{void refresh();},[refresh]);
  const logout=useCallback(async()=>{await fetch("/api/auth/logout",{method:"POST"});setUser(null);},[]);
  return <AuthContext.Provider value={{user,loading,refresh,logout}}>{children}</AuthContext.Provider>;
}
export const useAuth=()=>useContext(AuthContext);
