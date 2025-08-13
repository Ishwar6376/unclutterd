"use client";
import React from "react";
import { useState,useEffect } from "react";
import { Book, Bell } from "lucide-react";
import GlareHover from "@/components/uiComponent/glareHover/page";
import { useAuth0 } from "@auth0/auth0-react";
import Header from "@/app/component/home/header"
import Sidebar from "@/app/component/home/sidebar"
import MainContent from "@/app/component/home/heroSection"
    import axios from 'axios';

export default  function Home() {
    const { logout } = useAuth0();
    const handleLogout = () => {
      logout({
        logoutParams: {
          returnTo: typeof window !== "undefined" ? window.location.origin : "",
        },
      });
    };
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const getData = async () => {
      console.log("calling api");
      const res=await axios.get("/api/home");
      console.log(res);
    }
    useEffect(() => {
      getData();
    }, []);
  return (
    <div className="h-screen flex flex-col">
      <Header onMenuClick={() => setIsSidebarOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <MainContent />
      </div>
    </div>
  )
}
