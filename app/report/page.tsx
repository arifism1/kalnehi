"use client";

import Link from "next/link";
import AuthOnboarding from "@/components/AuthOnboarding";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase-client";

export default function ReportPage() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (!session) return <AuthOnboarding />;

  return (
    <div className="min-h-screen overflow-x-hidden">
      <main className="space-y-8 px-1 py-2">
        <div className="mb-8 flex flex-col gap-4 pl-1">
          <div className="min-w-0 pl-1">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-200">
              Report
            </p>
            <h1 className="mt-2 break-words text-2xl font-bold tracking-tight text-white">
              Strategy is now automatic.
            </h1>
            <p className="mt-3 break-words text-sm text-white/70">
              Kalnehi builds your plan directly from your syllabus coverage and study history.
              There is no longer a chat or voice layer here.
            </p>
          </div>
          <Link
            href="/"
            className="glass-button flex w-full items-center justify-center gap-2 truncate whitespace-nowrap text-sm font-medium"
          >
            <ArrowLeft size={14} />
            Dashboard
          </Link>
        </div>

        <section className="glass-card overflow-hidden p-6">
          <p className="text-sm text-white/70">
            Use the Planner to see today&apos;s deterministic directives and the Skill Map to explore
            dependencies. If you&apos;re struggling with a topic, mark it from your tasks list and
            Kalnehi will automatically schedule its prerequisites for tomorrow.
          </p>
        </section>
      </main>
    </div>
  );
}

