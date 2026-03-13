import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-server";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export type AuthResult = {
  userId: string;
  targetExam: "NEET" | "JEE_MAIN" | "JEE_ADVANCED";
};

export async function getAuthFromRequest(request: Request): Promise<AuthResult | null> {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token || !url || !anonKey) return null;

  const supabaseAuth = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error: userError,
  } = await supabaseAuth.auth.getUser(token);
  if (userError || !user?.id) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("target_exam")
    .eq("id", user.id)
    .maybeSingle();

  const targetExamRaw = profile?.target_exam;
  const targetExam =
    targetExamRaw === "JEE_MAIN" || targetExamRaw === "JEE_ADVANCED"
      ? targetExamRaw
      : "NEET";

  return { userId: user.id, targetExam };
}
