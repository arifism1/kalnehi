"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase-client";

type TargetExam = "NEET" | "JEE_MAIN" | "JEE_ADVANCED";

export default function AuthOnboarding() {
  const [isSignIn, setIsSignIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState("");
  const [classVal, setClassVal] = useState("");
  const [targetExam, setTargetExam] = useState<TargetExam>("NEET");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) throw signUpError;
      const user = authData?.user;
      if (!user?.id) throw new Error("Sign up did not return user");
      await supabase.from("profiles").insert({
        id: user.id,
        phone: phone.trim() || null,
        state: state.trim() || null,
        class: classVal.trim() || null,
        target_exam: targetExam,
      });
      setMessage("Account created. Check your email to confirm, or sign in below.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="glass-card w-full max-w-md p-6 sm:p-8">
        <h1 className="mb-2 text-xl font-bold tracking-tight text-white">
          {isSignIn ? "Sign in" : "Join Kalnehi"}
        </h1>
        <p className="mb-6 text-sm text-white/70">
          {isSignIn ? "Sign in to continue." : "Create an account to start your triage."}
        </p>
        {isSignIn ? (
          <form onSubmit={handleSignIn} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-white/80">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-input"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-white/80">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input"
              />
            </div>
            {error && <p className="text-sm text-red-300">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="glass-button font-medium disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
            <button
              type="button"
              onClick={() => { setIsSignIn(false); setError(""); setMessage(""); }}
              className="text-sm text-white/70 transition-colors duration-200 hover:text-white"
            >
              Create an account instead
            </button>
          </form>
        ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-white/80">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="glass-input"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-white/80">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass-input"
            />
          </div>
          <div>
            <label htmlFor="phone" className="mb-1 block text-sm font-medium text-white/80">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="glass-input"
            />
          </div>
          <div>
            <label htmlFor="state" className="mb-1 block text-sm font-medium text-white/80">
              State
            </label>
            <input
              id="state"
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="glass-input"
            />
          </div>
          <div>
            <label htmlFor="class" className="mb-1 block text-sm font-medium text-white/80">
              Class
            </label>
            <select
              id="class"
              value={classVal}
              onChange={(e) => setClassVal(e.target.value)}
              className="glass-input"
            >
              <option value="">Select</option>
              <option value="11th">11th</option>
              <option value="12th">12th</option>
              <option value="Dropper">Dropper</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-white/80">
              Target Exam
            </label>
            <div className="flex gap-2">
              {(
                [
                  { value: "NEET" as const, label: "NEET" },
                  { value: "JEE_MAIN" as const, label: "JEE Main" },
                  { value: "JEE_ADVANCED" as const, label: "JEE Adv" },
                ] as const
              ).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTargetExam(value)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                    targetExam === value
                      ? "border-blue-300/30 bg-blue-500/30 text-white"
                      : "border-white/20 bg-white/10 text-white/80 hover:bg-white/20"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-300">{error}</p>
          )}
          {message && (
            <p className="text-sm text-emerald-300">{message}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="glass-button mt-2 font-medium disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create account"}
          </button>
          <button
            type="button"
            onClick={() => { setIsSignIn(true); setError(""); setMessage(""); }}
            className="text-sm text-white/70 transition-colors duration-200 hover:text-white"
          >
            Already have an account? Sign in
          </button>
        </form>
        )}
      </div>
    </div>
  );
}
