"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Network } from "lucide-react";
import { supabase } from "@/lib/supabase-client";
import type { Session } from "@supabase/supabase-js";
import AuthOnboarding from "@/components/AuthOnboarding";

type TopicNode = {
  id: number;
  subject: string | null;
  topic_name: string | null;
};

type SkillTreeResponse = {
  ok: boolean;
  topic: TopicNode | null;
  prerequisites: TopicNode[];
  dependents: TopicNode[];
  error?: string;
};

type ExpandedNode = {
  data: SkillTreeResponse;
  depth: number;
};

export default function SkillMapPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [rootTopic, setRootTopic] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [nodes, setNodes] = useState<Record<number, ExpandedNode>>({});
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  async function loadNode(topicId: number, depth: number) {
    if (!session?.access_token) return;
    if (depth > 2) return; // limit initial depth
    setLoadingId(topicId);
    setError("");
    try {
      const res = await fetch("/api/skill-tree", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ topicId }),
      });
      const data: SkillTreeResponse = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Unable to load this topic. Check the ID.");
        return;
      }

      setNodes((current) => ({
        ...current,
        [topicId]: { data, depth },
      }));
    } finally {
      setLoadingId(null);
    }
  }

  async function handleSetRoot() {
    if (!session?.access_token) return;
    const trimmed = query.trim();
    if (!trimmed) return;

    // Search by topic name first; let the API resolve to an ID.
    setError("");
    setRootTopic(null);
    setNodes({});

    try {
      const res = await fetch("/api/skill-tree", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ topicName: trimmed }),
      });
      const data: SkillTreeResponse = await res.json();
      if (!res.ok || !data.ok || !data.topic) {
        setError(data.error || "Topic not found. Try a different name.");
        return;
      }

      const id = data.topic.id;
      setRootTopic(id);
      setNodes({ [id]: { data, depth: 0 } });
    } catch (err) {
      console.error("Skill map root load failed", err);
      setError("Unable to load this topic. Check the name and try again.");
    }
  }

  if (!session) return <AuthOnboarding />;

  function renderTopic(node: TopicNode) {
    return (
      <span className="truncate">
        {node.subject && <span className="font-semibold">{node.subject}</span>}
        {node.topic_name && (
          <span className="text-white/80">{` · ${node.topic_name}`}</span>
        )}
      </span>
    );
  }

  function NodeRow({ nodeId, depth }: { nodeId: number; depth: number }) {
    const expanded = nodes[nodeId];
    const isLoading = loadingId === nodeId;

    return (
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => !expanded && void loadNode(nodeId, depth)}
          className="flex w-full items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-left text-sm text-white/80 transition-colors duration-200 hover:bg-white/10"
        >
          {expanded ? (
            <ChevronDown size={14} className="text-white/70" />
          ) : (
            <ChevronRight size={14} className="text-white/70" />
          )}
          <span className="text-xs font-mono text-white/60">#{nodeId}</span>
          {expanded?.data.topic ? (
            renderTopic(expanded.data.topic)
          ) : (
            <span className="text-xs text-white/60">
              {isLoading ? "Loading..." : "Load concept context"}
            </span>
          )}
        </button>

        {expanded && depth < 2 && (
          <div className="ml-5 space-y-2 border-l border-white/10 pl-3">
            {expanded.data.prerequisites.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-amber-200">
                  Prerequisites
                </p>
                <div className="space-y-1">
                  {expanded.data.prerequisites.map((p) => (
                    <NodeRow key={p.id} nodeId={p.id} depth={depth + 1} />
                  ))}
                </div>
              </div>
            )}
            {expanded.data.dependents.length > 0 && (
              <div className="mt-2">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-200">
                  Leads to
                </p>
                <div className="space-y-1">
                  {expanded.data.dependents.map((c) => (
                    <NodeRow key={c.id} nodeId={c.id} depth={depth + 1} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      <main className="space-y-5 px-1 py-2">
        <section className="glass-card overflow-hidden p-5">
          <div className="flex items-center gap-2 text-white/70">
            <Network size={18} className="text-blue-600" />
            <h1 className="text-sm font-bold uppercase tracking-widest">
              Skill Map
            </h1>
          </div>
          <p className="mt-3 text-sm text-white/70">
            Explore how concepts depend on each other. Type a topic name
            (for example &quot;Rotational Motion&quot; or &quot;Chemical
            Bonding&quot;) and expand only the layers you need.
          </p>
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="glass-input flex-1"
              placeholder="Search topic by name (e.g. Rotational Motion)"
            />
            <button
              type="button"
              onClick={handleSetRoot}
              className="glass-button flex-1 text-sm font-semibold"
            >
              Load map
            </button>
          </div>

          {error && (
            <p className="mt-3 text-xs text-amber-200">
              {error}
            </p>
          )}
        </section>

        {rootTopic && (
          <section className="glass-card overflow-hidden p-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-200">
              Concept graph
            </p>
            <NodeRow nodeId={rootTopic} depth={0} />
          </section>
        )}
      </main>
    </div>
  );
}

