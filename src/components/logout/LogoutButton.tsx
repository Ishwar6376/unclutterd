"use client"; // (Only if using App Router with client components)

import React from "react";
import { useAuth0 } from "@auth0/auth0-react";

const LogoutButton = () => {
  const { logout } = useAuth0();

  const handleLogout = () => {
    logout({
      logoutParams: {
        returnTo: typeof window !== "undefined" ? window.location.origin : "",
      },
    });
  };

  return (
    <button onClick={handleLogout} className="px-4 py-2 bg-blue-600 text-white rounded">
      Log Out
    </button>
  );
};

export default LogoutButton;
