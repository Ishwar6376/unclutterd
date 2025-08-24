"use client";
import React from "react";
import { useState,useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import Header from "@/app/component/home/header"
import Sidebar from "@/app/component/home/sidebar"
import MainContent from "@/app/component/home/heroSection"

export default  function Home() {
   
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  return (
    <div className="h-screen flex flex-col overflow-hidden">
  <Header onMenuClick={() => setIsSidebarOpen(true)} />
  
  <div className="flex flex-1">
    {/* Sidebar */}
    <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

    {/* Main Content */}
    <div className="flex-1 overflow-auto">
      <MainContent />
    </div>
  </div>
</div>

  )
}
