import { ZodError } from "zod";
import { AuthError } from "@/lib/auth";
export function errorResponse(error: unknown) {
  if (error instanceof AuthError) return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError) return Response.json({ error: "راجع البيانات المدخلة.", issues: error.issues.map(i => ({ field: i.path.join("."), message: i.message })) }, { status: 400 });
  if (error instanceof SyntaxError) return Response.json({ error: "صيغة الطلب غير صحيحة." }, { status: 400 });
  console.error(error);
  return Response.json({ error: "حدث خطأ غير متوقع. راجع إعدادات الخادم." }, { status: 500 });
}
export async function readJson(request: Request) { return request.json(); }
