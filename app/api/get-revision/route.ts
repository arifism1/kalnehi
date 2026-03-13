import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { getAuthFromRequest } from "@/lib/auth-server"

export async function GET(req: Request) {

  const auth = await getAuthFromRequest(req)

  if (!auth?.userId) {
    return NextResponse.json({ ok: false })
  }

  const today = new Date().toISOString().split("T")[0]

  const { data } = await supabaseAdmin
    .from("revision_queue")
    .select("*")
    .eq("user_id", auth.userId)
    .eq("next_revision", today)

  return NextResponse.json({
    ok: true,
    revisions: data
  })
}