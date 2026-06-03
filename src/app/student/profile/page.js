"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";

function normalizeTaskEntries(taskEntries, subjectList, legacyTaskSheet = "", legacyCriteria = "") {
  const normalized = {};

  subjectList.forEach((subject) => {
    const rawEntry = taskEntries?.[subject] || {};
    const assignments = Array.isArray(rawEntry.assignments) && rawEntry.assignments.length > 0
      ? rawEntry.assignments.map((assignment, index) => ({
          name: String(assignment?.name || `Assignment ${index + 1}`).trim() || `Assignment ${index + 1}`,
          taskSheet: String(assignment?.taskSheet || ""),
          criteria: String(assignment?.criteria || ""),
        }))
      : [
          {
            name: "Assignment 1",
            taskSheet: String(legacyTaskSheet || rawEntry?.taskSheet || ""),
            criteria: String(legacyCriteria || rawEntry?.criteria || ""),
          },
        ];

    normalized[subject] = { assignments };
  });

  return normalized;
}

export default function StudentProfilePage() {
  const router = useRouter();
  const [isTeacherView, setIsTeacherView] = useState(false);
  const [profile, setProfile] = useState({
    name: "",
    yearLevel: "",
    subjects: "",
    taskEntries: {},
  });
  const [activeSubject, setActiveSubject] = useState("");
  const [activeAssignmentName, setActiveAssignmentName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setIsTeacherView(params.get("teacherView") === "true" || params.get("teacherView") === "1");
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/");
        return;
      }

      const userDoc = await getDoc(doc(db, "users", user.uid));
      const role = userDoc.data()?.role;
      if (!userDoc.exists() || (role !== "student" && !(role === "teacher" && isTeacherView))) {
        router.replace("/");
        return;
      }

      const data = userDoc.data();
      const subjectList = Array.isArray(data.subjects)
        ? data.subjects
        : String(data.subjects || "")
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean);
      const taskEntries = normalizeTaskEntries(data.taskEntries || {}, subjectList, data.taskSheet || "", data.criteria || "");
      const firstSubject = subjectList[0] || "";
      const firstAssignment = taskEntries[firstSubject]?.assignments?.[0]?.name || "";

      setProfile({
        name: data.name || "",
        yearLevel: data.yearLevel || "",
        subjects: subjectList.join("\n"),
        taskEntries,
      });
      setActiveSubject(firstSubject);
      setActiveAssignmentName(firstAssignment);
    });

    return () => unsubscribe();
  }, [isTeacherView, router]);

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("You must be logged in to save your profile.");

      const subjectList = profile.subjects
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
      const taskEntries = Object.fromEntries(
        subjectList.map((subject) => [
          subject,
          {
            assignments: (profile.taskEntries?.[subject]?.assignments || [{ name: "Assignment 1", taskSheet: "", criteria: "" }]).map((assignment, index) => ({
              name: String(assignment?.name || `Assignment ${index + 1}`).trim() || `Assignment ${index + 1}`,
              taskSheet: String(assignment?.taskSheet || ""),
              criteria: String(assignment?.criteria || ""),
            })),
          },
        ]),
      );
      const selectedSubject = subjectList.includes(activeSubject) ? activeSubject : subjectList[0] || "";
      const selectedAssignment = taskEntries[selectedSubject]?.assignments?.find((assignment) => assignment.name === activeAssignmentName)
        || taskEntries[selectedSubject]?.assignments?.[0]
        || { name: "", taskSheet: "", criteria: "" };

      await setDoc(
        doc(db, "users", user.uid),
        {
          name: profile.name.trim(),
          yearLevel: profile.yearLevel.trim(),
          subjects: subjectList,
          taskEntries,
          taskSheet: selectedAssignment.taskSheet,
          criteria: selectedAssignment.criteria,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      setSaved(true);
    } catch (err) {
      setError(err.message || "Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  }

  const subjectList = profile.subjects
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  const currentAssignments = profile.taskEntries?.[activeSubject]?.assignments || [{ name: "Assignment 1", taskSheet: "", criteria: "" }];
  const selectedAssignment = currentAssignments.find((assignment) => assignment.name === activeAssignmentName) || currentAssignments[0] || { name: "Assignment 1", taskSheet: "", criteria: "" };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/90 px-6 py-5 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Student Profile</p>
            <h1 className="mt-2 text-3xl font-semibold">Tell us about your learning context</h1>
            <p className="mt-2 text-slate-300">Add your year level, subjects, task sheet, and success criteria to help coaching stay relevant.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {isTeacherView ? (
              <button
                type="button"
                onClick={() => router.push("/teacher")}
                className="rounded-3xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/20"
              >
                Back to teacher mode
              </button>
            ) : (
              <Link href="/student" className="rounded-3xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 hover:border-cyan-400 hover:text-cyan-100">Back to chat</Link>
            )}
            <button type="button" onClick={() => signOut(auth).then(() => router.replace("/"))} className="rounded-3xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 hover:border-rose-400 hover:text-rose-200">Log out</button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        <form onSubmit={handleSave} className="grid gap-5 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-slate-950/40">
          <label className="grid gap-2 text-sm text-slate-200">
            Name
            <input value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} className="rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400" placeholder="Your name" />
          </label>

          <label className="grid gap-2 text-sm text-slate-200">
            Year level
            <input value={profile.yearLevel} onChange={(event) => setProfile((current) => ({ ...current, yearLevel: event.target.value }))} className="rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400" placeholder="e.g. Year 10" />
          </label>

          <label className="grid gap-2 text-sm text-slate-200">
            Subjects
            <textarea
              rows="3"
              value={profile.subjects}
              onChange={(event) => {
                const nextSubjects = event.target.value;
                const subjectsList = nextSubjects
                  .split("\n")
                  .map((item) => item.trim())
                  .filter(Boolean);

                setProfile((current) => ({
                  ...current,
                  subjects: nextSubjects,
                  taskEntries: normalizeTaskEntries(
                    Object.fromEntries(subjectsList.map((subject) => [subject, current.taskEntries?.[subject] || { assignments: [{ name: "Assignment 1", taskSheet: "", criteria: "" }] }])),
                    subjectsList,
                  ),
                }));
                setActiveSubject(subjectsList.includes(activeSubject) ? activeSubject : subjectsList[0] || "");
                setActiveAssignmentName(subjectsList.includes(activeSubject)
                  ? (profile.taskEntries?.[activeSubject]?.assignments?.[0]?.name || "")
                  : (subjectsList[0] ? (profile.taskEntries?.[subjectsList[0]]?.assignments?.[0]?.name || "") : ""));
              }}
              className="rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
              placeholder="One subject per line (for example: English, History, Biology)"
            />
          </label>

          <div className="grid gap-3 rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
            <div>
              <p className="text-sm font-semibold text-slate-100">Choose a subject focus</p>
              <p className="text-xs text-slate-400">Each subject keeps its own task sheet and criteria so the coach can focus on one set at a time.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {subjectList.length > 0 ? subjectList.map((subject) => (
                <button
                  key={subject}
                  type="button"
                  onClick={() => {
                    setActiveSubject(subject);
                    setActiveAssignmentName(profile.taskEntries?.[subject]?.assignments?.[0]?.name || "Assignment 1");
                  }}
                  className={`rounded-full border px-3 py-2 text-sm transition ${activeSubject === subject ? "border-cyan-400 bg-cyan-500/10 text-cyan-100" : "border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500"}`}
                >
                  {subject}
                </button>
              )) : <p className="text-sm text-slate-500">Add at least one subject to create separate task tabs.</p>}
            </div>
          </div>

          {activeSubject ? (
            <div className="grid gap-5 rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-100">Assignments for {activeSubject}</p>
                  <p className="text-xs text-slate-400">Name each one like PIA1, FIA2, or Term 1 Essay so the coach can focus on one at a time.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setProfile((current) => {
                      const existing = current.taskEntries?.[activeSubject]?.assignments || [];
                      const nextAssignment = { name: `Assignment ${existing.length + 1}`, taskSheet: "", criteria: "" };
                      return {
                        ...current,
                        taskEntries: {
                          ...(current.taskEntries || {}),
                          [activeSubject]: {
                            assignments: [...existing, nextAssignment],
                          },
                        },
                      };
                    });
                    setActiveAssignmentName(`Assignment ${currentAssignments.length + 1}`);
                  }}
                  className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-500/20"
                >
                  + Add assignment
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {currentAssignments.map((assignment) => (
                  <button
                    key={`${activeSubject}-${assignment.name}`}
                    type="button"
                    onClick={() => setActiveAssignmentName(assignment.name)}
                    className={`rounded-full border px-3 py-2 text-sm transition ${selectedAssignment.name === assignment.name ? "border-cyan-400 bg-cyan-500/10 text-cyan-100" : "border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500"}`}
                  >
                    {assignment.name}
                  </button>
                ))}
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-2 text-sm text-slate-200">
                  Assignment name
                  <input
                    value={selectedAssignment.name}
                    onChange={(event) => {
                      const nextName = event.target.value;
                      setProfile((current) => ({
                        ...current,
                        taskEntries: {
                          ...(current.taskEntries || {}),
                          [activeSubject]: {
                            assignments: (current.taskEntries?.[activeSubject]?.assignments || []).map((assignment) => assignment.name === selectedAssignment.name
                              ? { ...assignment, name: nextName }
                              : assignment),
                          },
                        },
                      }));
                      setActiveAssignmentName(nextName);
                    }}
                    className="rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
                    placeholder="e.g. PIA1, FIA2, Term 1 Essay"
                  />
                </label>

                <label className="grid gap-2 text-sm text-slate-200">
                  Task sheet / assignment prompt
                  <textarea
                    rows="6"
                    value={selectedAssignment.taskSheet}
                    onChange={(event) => setProfile((current) => ({
                      ...current,
                      taskEntries: {
                        ...(current.taskEntries || {}),
                        [activeSubject]: {
                          assignments: (current.taskEntries?.[activeSubject]?.assignments || []).map((assignment) => assignment.name === selectedAssignment.name
                            ? { ...assignment, taskSheet: event.target.value }
                            : assignment),
                        },
                      },
                    }))}
                    className="rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
                    placeholder={`Paste the ${activeSubject} task sheet or prompt here`}
                  />
                </label>

                <label className="grid gap-2 text-sm text-slate-200 md:col-span-2">
                  Criteria / success indicators
                  <textarea
                    rows="6"
                    value={selectedAssignment.criteria}
                    onChange={(event) => setProfile((current) => ({
                      ...current,
                      taskEntries: {
                        ...(current.taskEntries || {}),
                        [activeSubject]: {
                          assignments: (current.taskEntries?.[activeSubject]?.assignments || []).map((assignment) => assignment.name === selectedAssignment.name
                            ? { ...assignment, criteria: event.target.value }
                            : assignment),
                        },
                      },
                    }))}
                    className="rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
                    placeholder={`Paste the ${activeSubject} marking criteria or indicators here`}
                  />
                </label>
              </div>
            </div>
          ) : (
            <p className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-400">Add a subject above, then choose it to paste that subject’s task sheet and criteria.</p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              {error ? <p className="text-sm text-rose-400">{error}</p> : null}
              {saved ? <p className="text-sm text-emerald-300">Profile saved.</p> : null}
            </div>
            <button type="submit" disabled={saving} className="rounded-3xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving..." : "Save profile"}</button>
          </div>
        </form>
      </main>
    </div>
  );
}
