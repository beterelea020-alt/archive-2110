import { z } from "zod";
import { requireAdmin, authErrorResponse } from "@/lib/auth";
import { query } from "@/lib/db";
import { errorResponse } from "@/lib/http";
const schema=z.object({content:z.string().trim().min(100,"الملف قصير جدًا.").max(200000,"الملف يتجاوز الحد المسموح.")});
export async function GET(){
  try{await requireAdmin();const r=await query<any>("SELECT content,uploaded_at AS \"uploadedAt\" FROM admin_guides WHERE id=1");return Response.json({guide:r.rows[0]??null});}
  catch(e){return authErrorResponse(e);}
}
export async function PUT(request:Request){
  try{const admin=await requireAdmin();const {content}=schema.parse(await request.json());
    await query(`INSERT INTO admin_guides(id,content,uploaded_by,uploaded_at) VALUES(1,$1,$2,now())
      ON CONFLICT(id) DO UPDATE SET content=EXCLUDED.content,uploaded_by=EXCLUDED.uploaded_by,uploaded_at=now()`,[content,admin.id]);
    await query("INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,details) VALUES($1,'secret_guide_uploaded','admin_guide','1',$2)",[admin.id,JSON.stringify({characters:content.length})]);
    return Response.json({ok:true,message:"تم حفظ الدليل السري داخل قاعدة البيانات. لا يُعرض إلا لحسابات الإدارة."});
  }catch(e){return errorResponse(e);}
}
