"use client";

import { useAuth0 } from "@auth0/auth0-react";
import { useEffect } from "react";
import { useUserStore } from "@/store/userStore";
import axios from "axios";
export default function AuthSync() {
  const { user, isAuthenticated, isLoading } = useAuth0();
  const setUser = useUserStore((state) => state.setUser);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user && user.email) {
      setUser(user);
      async function postData(user: any) {
        const res=await axios.post("/api/users", {
          email: user.email,
          username: user.name,
          avatar: user.picture,
        });
        console.log(res);
      }
      postData(user);
    }
  }, [isLoading, isAuthenticated, user, setUser]);

  return null;
}
