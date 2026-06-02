"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [role, setRole] = useState("student");
  const [teacherCode, setTeacherCode] = useState("");

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      const userDoc = await getDoc(doc(db, "users", uid));

      if (!userDoc.exists()) {
        setError("No matching user document found.");
        setLoading(false);
        return;
      }

      const role = userDoc.data().role;
      if (role === "teacher") {
        router.push("/teacher");
      } else if (role === "student") {
        router.push("/student");
      } else {
        setError("Your account does not have a valid role.");
      }
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAccount(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    if (!name.trim()) {
      setError("Please enter your name.");
      setLoading(false);
      return;
    }

    if (role === "teacher") {
      const expectedCode = process.env.NEXT_PUBLIC_TEACHER_SIGNUP_CODE || "teacher-2026";
      if (teacherCode.trim() !== expectedCode) {
        setError("Teacher sign-up code is incorrect.");
        setLoading(false);
        return;
      }
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      await setDoc(doc(db, "users", uid), {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        level: role === "teacher" ? 3 : 1,
        xp: role === "teacher" ? 100 : 0,
        motivation: role === "teacher" ? "leadership" : "curious",
        createdAt: new Date().toISOString(),
      }, { merge: true });

      router.push(role === "teacher" ? "/teacher" : "/student");
    } catch (err) {
      setError(err.message || "Could not create account.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    setError("");

    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      const userDoc = await getDoc(doc(db, "users", result.user.uid));

      if (!userDoc.exists()) {
        await setDoc(doc(db, "users", result.user.uid), {
          name: result.user.displayName || "Google User",
          email: result.user.email || "",
          role: "student",
          level: 1,
          xp: 0,
          motivation: "curious",
          createdAt: new Date().toISOString(),
        }, { merge: true });
      }

      router.push("/student");
    } catch (err) {
      setError(err.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/95 p-8 shadow-2xl shadow-black/40">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">Heureka</p>
          <h1 className="mt-4 text-4xl font-semibold">{isCreatingAccount ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-3 text-slate-400">
            {isCreatingAccount
              ? "Sign up to start your student coaching experience."
              : "Log in with your Firebase account to continue."}
          </p>
        </div>

        <form onSubmit={isCreatingAccount ? handleCreateAccount : handleLogin} className="space-y-5">
          {isCreatingAccount && (
            <>
              <label className="block text-sm font-medium text-slate-300">
                Name
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="mt-2 w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
                  placeholder="Your name"
                />
              </label>

              <div className="grid gap-3">
                <label className="text-sm font-medium text-slate-300">Choose your role</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    { value: "student", label: "Student" },
                    { value: "teacher", label: "Teacher" },
                  ].map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() => setRole(option.value)}
                      className={`rounded-3xl border px-4 py-3 text-sm font-semibold transition ${
                        role === option.value
                          ? "border-cyan-400 bg-cyan-500/10 text-cyan-100"
                          : "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {role === "teacher" && (
                <label className="block text-sm font-medium text-slate-300">
                  Teacher sign-up code
                  <input
                    type="password"
                    value={teacherCode}
                    onChange={(e) => setTeacherCode(e.target.value)}
                    required
                    className="mt-2 w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400"
                    placeholder="Enter your teacher code"
                  />
                </label>
              )}
            </>
          )}

          <label className="block text-sm font-medium text-slate-300">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-2 w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
              placeholder="you@example.com"
            />
          </label>

          <label className="block text-sm font-medium text-slate-300">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-2 w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
              placeholder="••••••••"
            />
          </label>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-3xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
          >
            {loading ? (isCreatingAccount ? "Creating account..." : "Logging in...") : isCreatingAccount ? "Create account" : "Login"}
          </button>

          {!isCreatingAccount && (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-400 hover:text-cyan-100 disabled:opacity-60"
            >
              Continue with Google
            </button>
          )}
        </form>

        <div className="mt-4 text-center text-sm text-slate-400">
          <button
            type="button"
            onClick={() => {
              setIsCreatingAccount(!isCreatingAccount);
              setError("");
            }}
            className="font-medium text-cyan-300 hover:text-cyan-200"
          >
            {isCreatingAccount ? "Already have an account? Log in" : "Create account"}
          </button>
        </div>
      </div>
    </div>
  );
}
