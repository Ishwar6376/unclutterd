"use client";
import React from "react";
import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import Header from "@/app/component/home/header";
import Sidebar from "@/app/component/home/sidebar";
import MainContent from "@/app/component/home/heroSection";
export default function Home() {
  const { logout } = useAuth0();
  
  const handleLogout = () => {
    logout({
      logoutParams: {
        returnTo: typeof window !== "undefined" ? window.location.origin : "",
      },
    });
  };

  // Sidebar states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Check if we're on mobile
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sidebar handlers
  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleToggleCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="h-screen w-full flex flex-col pt-16 ">
      <Header onMenuClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={handleCloseSidebar}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      
        {/* Main content - remove margin, let it take remaining space naturally */}
        <div className="flex-1 transition-all duration-300 min-w-0 ">
          <MainContent />
        </div>
      </div>
    </div>
  );
}