"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import useAuth from "../../lib/useAuth";
import { useTeacherView } from "../../lib/TeacherViewContext";

export default function TeacherPage() {
  const router = useRouter();
  const { loading: authLoading } = useAuth({ allowedRoles: ["teacher"] });
  const { enableTeacherView } = useTeacherView();
  const [students, setStudents] = useState([]);
  const [classId, setClassId] = useState("English10");
  const [lessonGoal, setLessonGoal] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStudents = useCallback(async () => {
    try {
      const studentsQuery = query(collection(db, "users"), where("role", "==", "student"));
      const snapshot = await getDocs(studentsQuery);
      setStudents(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      setError("Failed to load students.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    loadStudents();
  }, [authLoading, loadStudents]);


  const loadLessonGoal = useCallback(async (id) => {
    try {
      const snap = await getDoc(doc(db, "systemConfig", id));
      setLessonGoal(snap.exists() ? (snap.data().liveLessonGoal || "") : "");
    } catch {
      setLessonGoal("");
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    loadStudents();
    loadLessonGoal(classId);
  }, [authLoading, loadStudents, loadLessonGoal, classId]);

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, "systemConfig", classId), {
        liveLessonGoal: lessonGoal,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      setError("Unable to save the lesson goal.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <header className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl shadow-slate-950/40">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Teacher Dashboard</p>
          <h1 className="mt-3 text-4xl font-semibold">Student Progress</h1>
          <p className="mt-2 text-slate-400">Review learners and publish a live lesson goal for any class.</p>
        </header>

        <section className="mb-10 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <form onSubmit={handleSave} className="grid gap-4">
            <label className="text-sm font-medium text-slate-200" htmlFor="classId">
              Class
            </label>
            <input
              id="classId"
              value={classId}
              onChange={(event) => {
                const next = event.target.value.trim() || "English10";
                setClassId(next);
                loadLessonGoal(next);
              }}
              className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400"
              placeholder="e.g. English 10, Math 9, History 11"
            />
            <label className="text-sm font-medium text-slate-200" htmlFor="lessonGoal">
              Live Lesson Goal
            </label>
            <textarea
              id="lessonGoal"
              rows="3"
              value={lessonGoal}
              onChange={(event) => setLessonGoal(event.target.value)}
              className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400"
              placeholder="Type the lesson objective for the class..."
            />
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-3xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Goal"}
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Students</h2>
              <p className="text-slate-400">Displaying all Firestore users with the student role.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  enableTeacherView();
                  router.push("/student");
                }}
                className="inline-flex items-center justify-center rounded-3xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
              >
                Student view
              </button>
              <p className="text-sm text-slate-500">{loading ? "Loading students..." : `${students.length} students found`}</p>
            </div>
          </div>

          {error && <p className="mb-4 text-sm text-rose-400">{error}</p>}

          <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-950">
            <table className="min-w-full divide-y divide-slate-800 text-left text-sm text-slate-300">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Level / XP</th>
                  <th className="px-6 py-4">Dominant Motivation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-900/70">
                    <td className="px-6 py-4 font-medium text-slate-100">{student.name || student.id}</td>
                    <td className="px-6 py-4">Level {student.level ?? 1} · {student.xp ?? 0} XP</td>
                    <td className="px-6 py-4">{student.motivation ?? "Curious"}</td>
                  </tr>
                ))}
                {!loading && students.length === 0 && (
                  <tr>
                    <td colSpan="3" className="px-6 py-8 text-center text-slate-500">
                      No students found in Firestore.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
