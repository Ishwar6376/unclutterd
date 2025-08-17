"use client";
import React from "react";
import { useState, useEffect } from "react";
import { Book, Bell } from "lucide-react";
import GlareHover from "@/components/uiComponent/glareHover/page";
import { useAuth0 } from "@auth0/auth0-react";
import Header from "@/app/component/home/header";
import Sidebar from "@/app/component/home/sidebar";
import MainContent from "@/app/component/home/heroSection";
import axios from 'axios';

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

  const getData = async () => {
    console.log("calling api");
    const res = await axios.get("/api/home");
    console.log(res);
  };

  useEffect(() => {
    getData();
  }, []);

  // Sidebar handlers
  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleToggleCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="h-screen flex flex-col">
      <Header onMenuClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={handleCloseSidebar}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
        
        {/* Main content with dynamic margin based on sidebar state and screen size */}
        <div className={`flex-1 transition-all duration-300 ${
          // On mobile: always full width (sidebar overlays when expanded)
          // On desktop: adjust margin based on sidebar state (sidebar shifts content)
          isMobile ? 'w-full' : (isSidebarCollapsed ? 'ml-16' : 'ml-60')
        }`}>
          <MainContent />
        </div>
      </div>
    </div>
  );
}