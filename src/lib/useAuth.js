"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

/**
 * Shared auth guard hook.
 *
 * Listens to Firebase auth state, fetches the user's Firestore profile,
 * and enforces role-based access. Redirects to "/" if the user is not
 * authenticated or their role is not in `allowedRoles`.
 *
 * @param {Object} options
 * @param {string[]} [options.allowedRoles=[]] - Roles permitted to access the page.
 * @param {boolean} [options.allowTeacherView=false] - If true, a teacher
 *   accessing via ?teacherView=true is also allowed (for student pages).
 * @returns {{ user: object|null, profile: object|null, loading: boolean, error: string, isTeacherView: boolean }}
 */
export default function useAuth({ allowedRoles = [], allowTeacherView = false } = {}) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isTeacherView, setIsTeacherView] = useState(false);

  useEffect(() => {
    // Read teacherView param once on mount (only relevant for student pages)
    if (allowTeacherView && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setIsTeacherView(params.get("teacherView") === "true" || params.get("teacherView") === "1");
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setLoading(false);
        router.replace("/");
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

        if (!userDoc.exists()) {
          setLoading(false);
          setError("User profile not found.");
          router.replace("/");
          return;
        }

        const profileData = userDoc.data();
        const role = profileData.role;

        // Determine if the current role is allowed
        const roleAllowed =
          allowedRoles.length === 0 ||
          allowedRoles.includes(role) ||
          (allowTeacherView && role === "teacher" && isTeacherView);

        if (!roleAllowed) {
          setLoading(false);
          router.replace("/");
          return;
        }

        setUser(firebaseUser);
        setProfile(profileData);
      } catch (err) {
        setError(err.message || "Failed to load user profile.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [allowedRoles.join(","), allowTeacherView, isTeacherView, router]);

  return { user, profile, loading, error, isTeacherView };
}
