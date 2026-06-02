"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

const initialMessages = [
  {
    role: "assistant",
    content: "Welcome to Socratic Studio. Ask a question or describe the problem you're working on.",
  },
];

export default function StudentPage() {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/");
        return;
      }

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists() || userDoc.data().role !== "student") {
        router.replace("/");
      }
    });

    return () => unsubscribe();
  }, [router]);

  async function handleSend(event) {
    event.preventDefault();
    if (!input.trim()) return;

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
          profileContext: {
            name: "Student",
            role: "student",
            level: 1,
            xp: 0,
            motivation: "curious",
          },
          currentTaskContext: {
            subject: "English 10",
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/90 px-6 py-5 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Heureka Studio</p>
            <h1 className="mt-2 text-3xl font-semibold">Student Chat</h1>
          </div>
          <div className="rounded-3xl bg-slate-800 p-4 text-sm">
            <p className="text-slate-400">Level 1 · 0 / 100 XP</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-700">
              <div className="h-full w-0 rounded-full bg-cyan-400" />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
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
                  <p className="text-sm leading-6">{message.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={handleSend} className="grid gap-4 rounded-3xl border border-slate-800 bg-slate-900 p-4">
          <label className="text-sm text-slate-400" htmlFor="studentMessage">
            Send a coaching question or work through a problem.
          </label>
          <textarea
            id="studentMessage"
            rows="3"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
            placeholder="Type your question here..."
          />
          <div className="flex items-center justify-between gap-4">
            {error ? <p className="text-sm text-rose-400">{error}</p> : <span className="text-sm text-slate-500">AI coaching only, no direct answers.</span>}
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
