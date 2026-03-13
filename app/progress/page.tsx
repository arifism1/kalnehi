"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function ProgressPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <main className="space-y-4 px-1 py-2">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-200">
          Progress
        </p>
        <h1 className="mt-2 break-words text-2xl font-bold tracking-tight text-white">
          Mastery &amp; Rank Predictor
        </h1>
        <p className="mt-3 break-words text-sm text-white/70">
          Your mastery stats and rank predictor live on the dashboard.
        </p>
        <Link
          href="/"
          className="glass-button mt-6 flex w-full items-center justify-center gap-2 text-sm font-medium"
        >
          <ArrowRight size={14} />
          Go to Dashboard
        </Link>
      </main>
    </div>
  );
}
