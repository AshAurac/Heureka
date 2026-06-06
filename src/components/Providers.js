"use client";

import { TeacherViewProvider } from "@/lib/TeacherViewContext";

export default function Providers({ children }) {
  return <TeacherViewProvider>{children}</TeacherViewProvider>;
}
