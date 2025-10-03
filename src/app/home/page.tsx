"use client";
import React, { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useUserStore } from "@/store/userStore";
import Header from "@/app/component/home/header";
import Sidebar from "@/app/component/home/sidebar";
import MainContent from "@/app/component/home/heroSection";

export default function Home() {
  const { logout, isAuthenticated, getIdTokenClaims } = useAuth0();
  const setUser = useUserStore((state) => state.setUser);
  const setAccessToken = useUserStore((state) => state.setAccessToken);

  // Sidebar states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Handle logout
  const handleLogout = () => {
    logout({
      logoutParams: {
        returnTo: typeof window !== "undefined" ? window.location.origin : "",
      },
    });
  };

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Cache user info in backend (Redis)
  useEffect(() => {
    async function cacheUser() {
      if (!isAuthenticated) return;

      try {
        const tokenClaims = await getIdTokenClaims();
        const token = tokenClaims?.__raw;
        if (!token) return;

        setAccessToken(token);
        setUser(tokenClaims);

        // Send user info to backend API to store in Redis
        await fetch("/api/cacheUser", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify(tokenClaims), // or pick specific fields
        });
      } catch (err) {
        console.error("Failed to cache user:", err);
      }
    }

    cacheUser();
  }, [isAuthenticated, getIdTokenClaims, setUser, setAccessToken]);

  // Sidebar handlers
  const handleCloseSidebar = () => setIsSidebarOpen(false);
  const handleToggleCollapse = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  return (
    <div className="h-screen w-full flex flex-col pt-16">
      <Header onMenuClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={handleCloseSidebar}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
        <div className="flex-1 transition-all duration-300 min-w-0">
          <MainContent />
        </div>
      </div>
    </div>
  );
}
