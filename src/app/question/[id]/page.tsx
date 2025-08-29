"use client";
import React from "react";
import { useState, useEffect } from "react";

import Header from "@/app/component/home/header";
import Sidebar from "@/app/component/home/sidebar";
import { useParams } from "next/navigation";
import axios from "axios";
import QuestionCard from "@/components/questionCard";
export interface Question {
  _id: string;                // MongoDB ObjectId as string
  title: string;
  description: string;
  author: string;             // user _id
  votes: number;
  isAnswered: boolean;
  tags: string[];
  image: string[];            // URLs or base64
  createdAt: string;          // ISO date string
  updatedAt: string;          // ISO date string
  __v: number;                // Mongoose version key
}


export default function Searchpage() {
  const [que, setQue] = useState<Question>({
  _id: "",
  title: "",
  description: "",
  author: "",
  votes: 0,
  isAnswered: false,
  tags: [],
  image: [],
  createdAt: "",
  updatedAt: "",
  __v: 0,
});
  const q_id=useParams();
  const id=q_id.id
  const fetchQuestion=async()=>{
      console.log(q_id)
      const res = await axios.post("/api/getQue", { id });
      setQue(res.data.Question);
      console.log(res.data.Question);

  }
  useEffect(()=>{
    // console.log(id)
    fetchQuestion();
  },[q_id])

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
        
        {/* {searched q will be here} */}
        <div className="w-3/4 flex-1 transition-all duration-300 min-w-0">
         <QuestionCard
          title={que.title}
          description={que.description}
          images={que.image}
          votes={que.votes}
          />
        </div>
      </div>
    </div>
  );
}