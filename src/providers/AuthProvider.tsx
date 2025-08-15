"use client";

import { Auth0Provider } from "@auth0/auth0-react";
import { useRouter } from "next/navigation";
import AuthSync from "@/utils/authSync"; // we'll create this

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const onRedirectCallback = (appState: any) => {
    router.push(appState?.returnTo || "/home");
  };

  return (
    <Auth0Provider
      domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN!}
      clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID!}
      authorizationParams={{
        redirect_uri:
          typeof window !== "undefined" ? `${window.location.origin}/home` : "",
      }}
      onRedirectCallback={onRedirectCallback}
    >
      {/* Sync user after Auth0 context is ready */}
      <AuthSync />
      {children}
    </Auth0Provider>
  );
}
