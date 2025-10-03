"use client";

import { useAuth0, User as Auth0User } from "@auth0/auth0-react";
import { useEffect } from "react";
import { useUserStore } from "@/store/userStore";
import axios from "axios";

export default function AuthSync() {
  const { user, isAuthenticated, isLoading, getIdTokenClaims } = useAuth0();
  const setUser = useUserStore((state) => state.setUser);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user && user.email) {
      async function syncUser() {
        try {
          const idTokenClaims = await getIdTokenClaims();
          const auth0Id = idTokenClaims?.sub; // Unique Auth0 user ID

          // Type assertion to fix TS error
          const u = user as Auth0User;

          const res = await axios.post("/api/users", {
            email: u.email,
            username: u.name,
            avatar: u.picture,
            auth0Id,
          });

          if (res.data?.user) {
            setUser(res.data.user);
            console.log("User synced in Zustand:", res.data.user);
          }
        } catch (err) {
          console.error("Error syncing user:", err);
        }
      }

      syncUser();
    }
  }, [isLoading, isAuthenticated, user, setUser, getIdTokenClaims]);

  return null;
}
