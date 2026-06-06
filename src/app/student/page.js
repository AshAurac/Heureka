"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";
import useAuth from "../../lib/useAuth";
import { parseSubjects, resolveActiveContext } from "../../lib/profileUtils";

const initialMessages = [
  {
    role: "assistant",
    content: "Welcome to Heureka Studio. Ask a question or describe the problem you're working on.",
  },
];

export default function StudentPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth({
    allowedRoles: ["student"],
  });
  const [messages, setMessages] = useState(initialMessages);
  const [activeSubject, setActiveSubject] = useState("");
  const [activeAssignmentName, setActiveAssignmentName] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [coachMode, setCoachMode] = useState("gentle");
  const endRef = useRef(null);

  // Derive subjects / assignments from profile once it loads
  useEffect(() => {
    if (!profile) return;
    const subjects = Array.isArray(profile.subjects)
      ? profile.subjects
      : String(profile.subjects || "")
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean);
    const firstSubject = subjects[0] || "";
    const firstAssignment = profile.taskEntries?.[firstSubject]?.assignments?.[0]?.name || "";
    setActiveSubject(firstSubject);
    setActiveAssignmentName(firstAssignment);
  }, [profile]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(event) {
    event.preventDefault();
    if (!input.trim() || loading) return;

    const { subjects, selectedSubject, subjectAssignments, selectedAssignment, selectedTask } = resolveActiveContext(profile, activeSubject, activeAssignmentName);

    const userMessage = { role: "user", content: input.trim() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messageHistory: nextMessages,
          coachMode,
          profileContext: {
            name: profile?.name || "Student",
            role: "student",
            yearLevel: profile?.yearLevel || "Unknown",
            subjects,
            level: profile?.level || 1,
            xp: profile?.xp || 0,
            motivation: profile?.motivation || "curious",
            taskSheet: selectedTask?.taskSheet || profile?.taskSheet || "",
            criteria: selectedTask?.criteria || profile?.criteria || "",
          },
          currentTaskContext: {
            subject: selectedSubject || (subjects[0] || "General"),
            taskSheet: selectedTask?.taskSheet || "",
            criteria: selectedTask?.criteria || "",
            objective: "Use questions and reflection to explore ideas rather than seek direct answers.",
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to get a response from the AI.");
      }

      setMessages((current) => [...current, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const { subjects, selectedSubject, subjectAssignments, selectedAssignment, selectedTask } = resolveActiveContext(profile, activeSubject, activeAssignmentName);
  const xpPercent = Math.min((profile?.xp || 0) % 100, 100);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/90 px-6 py-5 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Heureka Studio</p>
            <h1 className="mt-2 text-3xl font-semibold">Student Chat</h1>
            <p className="mt-2 text-slate-300">Welcome back, {profile?.name || "Student"}.</p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <div className="rounded-3xl bg-slate-800 p-4 text-sm text-center">
              <p className="text-slate-400">Level {profile?.level || 1} · {profile?.xp || 0} / 100 XP</p>
              <div className="mt-3 h-2 w-40 overflow-hidden rounded-full bg-slate-700">
                <div
                  className="h-full rounded-full bg-cyan-400 transition-all duration-500"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>
            <Link href="/student/profile" className="rounded-3xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 hover:border-cyan-400 hover:text-cyan-100">Edit profile</Link>
            <button type="button" onClick={() => signOut(auth).then(() => router.replace("/"))} className="rounded-3xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 hover:border-rose-400 hover:text-rose-200">Log out</button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-slate-950/40">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Subject & task focus</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-100">Pick the subject and assignment the coach should use.</h2>
              <p className="mt-2 text-sm text-slate-400">These controls sit above the chat so you can switch context quickly before asking the coach for help.</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-300">
              <p className="font-medium text-slate-100">Current focus</p>
              <p className="mt-1 text-cyan-100">{selectedSubject || "General"} • {selectedAssignment?.name || "No assignment selected"}</p>
            </div>
          </div>

          {subjects.length > 0 && (
            <div className="mt-5 grid gap-4 rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-100">Subjects</p>
                <p className="text-xs text-slate-400">Choose one subject at a time to keep the coaching context tight.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {subjects.map((subject) => (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => {
                      setActiveSubject(subject);
                      setActiveAssignmentName(profile?.taskEntries?.[subject]?.assignments?.[0]?.name || "");
                    }}
                    className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${selectedSubject === subject ? "border-cyan-400 bg-cyan-500/10 text-cyan-100" : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"}`}
                  >
                    {subject}
                  </button>
                ))}
              </div>

              {subjectAssignments.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-100">Assignments</p>
                  <p className="text-xs text-slate-400">Pick the named task for the selected subject.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {subjectAssignments.map((assignment) => (
                      <button
                        key={`${selectedSubject}-${assignment.name}`}
                        type="button"
                        onClick={() => setActiveAssignmentName(assignment.name)}
                        className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${activeAssignmentName === assignment.name ? "border-cyan-400 bg-cyan-500/10 text-cyan-100" : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"}`}
                      >
                        {assignment.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-slate-950/40">
          <div className="flex h-[60vh] flex-col gap-4 overflow-hidden rounded-3xl bg-slate-950 p-4">
            <div className="flex-1 space-y-4 overflow-y-auto pr-2">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`rounded-3xl px-4 py-3 ${
                    message.role === "assistant"
                      ? "bg-slate-800 text-slate-200 self-start"
                      : "bg-cyan-500/15 text-cyan-100 self-end"
                  } max-w-[85%]`}
                >
                  <div className="whitespace-pre-wrap text-sm leading-7">
                    {message.content
                      .split(/(\*\*[^*]+\*\*)/g)
                      .filter(Boolean)
                      .map((part, i) => {
                        if (/^\*\*[^*]+\*\*$/.test(part)) {
                          return <strong key={`${message.role}-${i}`} className="font-semibold text-white">{part.replace(/\*\*/g, "")}</strong>;
                        }
                        return <span key={`${message.role}-${i}`}>{part}</span>;
                      })}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
          </div>
        </div>

        <form onSubmit={handleSend} className="grid gap-4 rounded-3xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid gap-1">
              <label className="text-sm text-slate-400" htmlFor="studentMessage">Send a coaching question or work through a problem.</label>
              <p className="text-xs text-cyan-200">Tone: choose how the coach should respond.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "encouraging", label: "Encouraging" },
                { value: "humourous", label: "Humourous" },
                { value: "reflective", label: "Reflective" },
                { value: "gentle", label: "Gentle" },
                { value: "challenge", label: "Challenge" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCoachMode(option.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] transition ${coachMode === option.value ? "border-cyan-400 bg-cyan-500/10 text-cyan-100" : "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <textarea
            id="studentMessage"
            rows="3"
            value={input}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend(event);
              }
            }}
            onChange={(event) => setInput(event.target.value)}
            className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
            placeholder="Type your question here..."
          />
          <div className="flex items-center justify-between gap-4">
            {error ? <p className="text-sm text-rose-400">{error}</p> : <span className="text-sm text-slate-500">AI coaching only, no direct answers.</span>}
            {loading && <span className="text-sm text-cyan-200">...</span>}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-3xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Thinking..." : "Send"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
