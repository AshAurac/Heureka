"use client";

import { useRouter } from "next/navigation";
import { useTeacherView } from "@/lib/TeacherViewContext";

export default function TeacherViewBanner() {
  const router = useRouter();
  const { isTeacherView, disableTeacherView } = useTeacherView();

  if (!isTeacherView) return null;

  function handleSwitchBack() {
    disableTeacherView();
    router.push("/teacher");
  }

  return (
    <div className="sticky top-0 z-50 w-full border-b border-emerald-500/30 bg-emerald-950/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
          <p className="text-sm text-emerald-200">
            You are viewing as a student
          </p>
        </div>
        <button
          type="button"
          onClick={handleSwitchBack}
          className="inline-flex items-center justify-center rounded-3xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
        >
          Switch back to teacher mode
        </button>
      </div>
    </div>
  );
}
