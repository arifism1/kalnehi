import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getAuthFromRequest } from "@/lib/auth-server";

const EXAM_TOTALS = {
  NEET: 720,
  JEE_MAIN: 300,
  JEE_ADVANCED: 360,
} as const;

const PAPER_MULTIPLIERS = {
  NEET: { 2025: 1, 2024: 0.97, 2023: 0.94 },
  JEE_MAIN: { 2025: 1, 2024: 0.98, 2023: 0.95 },
  JEE_ADVANCED: { 2025: 1, 2024: 0.96, 2023: 0.93 },
} as const;

export async function GET(request: Request) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: mastered } = await supabaseAdmin
      .from("user_progress")
      .select("topic_id")
      .eq("user_id", auth.userId)
      .eq("is_mastered", true);

    const { data: syllabus } = await supabaseAdmin
      .from("micro_topics")
      .select("id, weightage_percentile, is_bottleneck")
      .eq("target_exam", auth.targetExam);

    if (!syllabus?.length) {
      return NextResponse.json({
        score2025: 0,
        score2024: 0,
        score2023: 0,
      });
    }

    const masteredIds = new Set(mastered?.map(m => m.topic_id));
    let score = 0;
    let totalPossible = 0;

    syllabus.forEach(t => {
      const multiplier = t.is_bottleneck ? 2.5 : 1;
      const weight = (t.weightage_percentile || 50) * multiplier;
      totalPossible += weight;
      if (masteredIds.has(t.id)) score += weight;
    });

    const examTotal = EXAM_TOTALS[auth.targetExam] ?? 720;
    const ratio = totalPossible > 0 ? score / totalPossible : 0;
    const multipliers = PAPER_MULTIPLIERS[auth.targetExam] ?? PAPER_MULTIPLIERS.NEET;

    const score2025 = Math.round(ratio * examTotal * multipliers[2025]);
    const score2024 = Math.round(ratio * examTotal * multipliers[2024]);
    const score2023 = Math.round(ratio * examTotal * multipliers[2023]);

    return NextResponse.json({
      score2025,
      score2024,
      score2023,
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}