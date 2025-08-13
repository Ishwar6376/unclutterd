"use client";

import { useAuth0 } from "@auth0/auth0-react";
import { useEffect } from "react";
import { useUserStore } from "@/store/userStore";

export default function AuthSync() {
  const { user, isAuthenticated, isLoading } = useAuth0();
  const setUser = useUserStore((state) => state.setUser);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      setUser(user);
      console.log("User saved to Zustand:", user);
    }
  }, [isLoading, isAuthenticated, user, setUser]);

  return null; // no UI, just syncing data
}
