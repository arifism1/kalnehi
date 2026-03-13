import { NextResponse } from "next/server"
import { getAuthFromRequest } from "@/lib/auth-server"
import { scheduleRepairPath } from "@/lib/repair-engine"

export async function POST(req: Request) {

  const auth = await getAuthFromRequest(req)

  if (!auth?.userId) {
    return NextResponse.json({
      ok: false,
      error: "Unauthorized"
    })
  }

  const { topicId } = await req.json()

  const repairTasks = await scheduleRepairPath(
    topicId,
    auth.userId
  )

  return NextResponse.json({
    ok: true,
    repairTasks
  })
}