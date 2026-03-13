import { NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth-server";
import { fetchAndGeneratePlan } from "@/app/actions/scheduler";

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req);

  if (!auth?.userId) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const minutes = Number(searchParams.get("minutes") ?? "120");
  const availableMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : 120;

  try {
    const plan = await fetchAndGeneratePlan(auth.userId, availableMinutes);
    return NextResponse.json({ ok: true, plan });
  } catch (error) {
    console.error("/api/todays-plan error", error);
    return NextResponse.json(
      { ok: false, error: "Failed to generate plan" },
      { status: 500 }
    );
  }
}

