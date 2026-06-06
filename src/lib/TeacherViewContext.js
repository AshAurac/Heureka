"use client";

import { createContext, useContext, useState, useCallback } from "react";

const TeacherViewContext = createContext({
  isTeacherView: false,
  enableTeacherView: () => {},
  disableTeacherView: () => {},
});

export function TeacherViewProvider({ children }) {
  const [isTeacherView, setIsTeacherView] = useState(false);

  const enableTeacherView = useCallback(() => setIsTeacherView(true), []);
  const disableTeacherView = useCallback(() => setIsTeacherView(false), []);

  return (
    <TeacherViewContext.Provider value={{ isTeacherView, enableTeacherView, disableTeacherView }}>
      {children}
    </TeacherViewContext.Provider>
  );
}

export function useTeacherView() {
  return useContext(TeacherViewContext);
}
