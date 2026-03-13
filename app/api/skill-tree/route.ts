import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { getAuthFromRequest } from "@/lib/auth-server"
import { toDatabaseTopicId } from "@/lib/topic-id"

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req)

  if (!auth?.userId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const rawTopicId = body?.topicId
    const rawTopicName: string | undefined = body?.topicName

    // 1) Resolve topic ID from either numeric id or topic_name in micro_topics.
    let dbTopicId = toDatabaseTopicId(rawTopicId)

    if (dbTopicId == null && rawTopicName && rawTopicName.trim().length > 0) {
      const trimmed = rawTopicName.trim()

      const { data: directMatch, error: directError } = await supabaseAdmin
        .from("micro_topics")
        .select("id, topic_name")
        .ilike("topic_name", `%${trimmed}%`)
        .limit(1)
        .maybeSingle()

      if (directError) {
        console.error("skill-tree: name search direct error", directError)
        return NextResponse.json(
          { ok: false, error: "Failed to search topic by name" },
          { status: 500 }
        )
      }

      dbTopicId = (directMatch?.id as number | undefined) ?? null
    }

    if (dbTopicId == null) {
      return NextResponse.json(
        { ok: false, error: "Topic not found in syllabus. Check spelling or seed micro_topics." },
        { status: 404 }
      )
    }

    // 2) Load the center node from micro_topics
    const { data: topicRow, error: topicError } = await supabaseAdmin
      .from("micro_topics")
      .select("id, subject, topic_name")
      .eq("id", dbTopicId)
      .maybeSingle()

    if (topicError) {
      console.error("skill-tree: topic load error", topicError)
      return NextResponse.json(
        { ok: false, error: "Failed to load topic from syllabus" },
        { status: 500 }
      )
    }

    if (!topicRow) {
      return NextResponse.json(
        { ok: false, error: "Topic not found in syllabus data" },
        { status: 404 }
      )
    }

    // 3) One-hop prerequisites (parents)
    const { data: prereqDeps, error: depsError } = await supabaseAdmin
      .from("topic_dependencies")
      .select("prerequisite_topic_id")
      .eq("topic_id", dbTopicId)

    if (depsError) {
      console.error("skill-tree: dependencies error", depsError)
      return NextResponse.json(
        { ok: false, error: "Failed to load topic dependencies" },
        { status: 500 }
      )
    }

    const prereqIds = (prereqDeps ?? []).map((d) => d.prerequisite_topic_id)

    const { data: prereqTopics, error: prereqError } = prereqIds.length
      ? await supabaseAdmin
          .from("micro_topics")
          .select("id, subject, topic_name")
          .in("id", prereqIds)
      : { data: [] as any[], error: null }

    if (prereqError) {
      console.error("skill-tree: prereq topics error", prereqError)
      return NextResponse.json(
        { ok: false, error: "Failed to load prerequisite topics" },
        { status: 500 }
      )
    }

    // 4) One-hop dependents (children)
    const { data: childDeps, error: childDepsError } = await supabaseAdmin
      .from("topic_dependencies")
      .select("topic_id")
      .eq("prerequisite_topic_id", dbTopicId)

    if (childDepsError) {
      console.error("skill-tree: child deps error", childDepsError)
      return NextResponse.json(
        { ok: false, error: "Failed to load dependent topics" },
        { status: 500 }
      )
    }

    const childIds = (childDeps ?? []).map((d) => d.topic_id)

    const { data: childTopics, error: childError } = childIds.length
      ? await supabaseAdmin
          .from("micro_topics")
          .select("id, subject, topic_name")
          .in("id", childIds)
      : { data: [] as any[], error: null }

    if (childError) {
      console.error("skill-tree: child topics error", childError)
      return NextResponse.json(
        { ok: false, error: "Failed to load dependent topics" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      topic: topicRow,
      prerequisites: prereqTopics ?? [],
      dependents: childTopics ?? [],
    })
  } catch (error) {
    console.error("POST /api/skill-tree failed", error)
    return NextResponse.json(
      { ok: false, error: "Failed to load skill tree" },
      { status: 500 }
    )
  }
}

