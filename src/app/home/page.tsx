"use client";
import React from "react";
import { Book, Bell } from "lucide-react";
import GlareHover from "@/components/glareHover/page";
import { useAuth0 } from "@auth0/auth0-react";
import { Question } from "@/components/type";
import  QuestionComponent  from "@/components/question/page";


export default function Home() {
    const { logout } = useAuth0();
    const handleLogout = () => {
      logout({
        logoutParams: {
          returnTo: typeof window !== "undefined" ? window.location.origin : "",
        },
      });
    };
    const sampleQuestion: Question = {
    id: "q1",
    title: "How does JavaScript event loop work?",
    body: "I've been trying to understand how async tasks are handled in JS...",
    tags: ["javascript", "event-loop", "async"],
    author: { id: "u1", username: "coder123" },
    comments: [
      {
        id: "c1",
        body: "You can think of it as a queue system.",
        author: { id: "u2", username: "devGuy" },
        replies: [
          {
            id: "c2",
            body: "Exactly! Microtasks vs Macrotasks is key.",
            author: { id: "u3", username: "proCoder" },
            replies: []
          }
        ]
      }
    ],
    answers: [
      {
        id: "a1",
        body: "The event loop handles async callbacks...",
        author: { id: "u4", username: "expertDev" },
        comments: [
          {
            id: "c3",
            body: "This is helpful, thanks!",
            author: { id: "u5", username: "happyUser" },
            replies: []
          }
        ]
      }
    ]
  };
  return (
    <div className="flex flex-col min-h-screen">
      <div className="min-h-screen bg-gray-900">
        {/* Header */}
        <header className="bg-gray-800 shadow-sm">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold flex">
                <Book /> Unclutter
              </h1>
              {/* Next: "Add animated logo" */}
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <a href="#" className="hover:text-primary-600 transition-colors">
                Home
              </a>
              <a href="#" className="hover:text-primary-600 transition-colors">
                Questions
              </a>
              <a href="#" className="hover:text-primary-600 transition-colors">
                Topics
              </a>
              <a href="#" className="hover:text-primary-600 transition-colors">
                Users
              </a>
              <a href="#" className="hover:text-primary-600 transition-colors">
                About
              </a>
            </div>
            <div className="flex items-center space-x-3">
              <button className="hidden md:block p-2 rounded-xl bg-orange-500 transition-colors text-black">
                <span className="material-symbols-outlined">500</span>
              </button>
              <button className="hidden md:block p-2 rounded-full hover:cursor-pointer transition-colors">
                <div className="w-9 h-9 flex items-center justify-center">
                    <GlareHover
                  glareColor="#ffffff"
                  glareOpacity={0.3}
                  glareAngle={-30}
                  
                  transitionDuration={800}
                  playOnce={false}
                >
                  <span className="material-symbols-outlined 0">
                    <Bell />
                  </span>
                </GlareHover>
                </div>
              </button>
              <button className="p-2 rounded-full hover:bg-gray-100 transition-colors md:hidden">
                <span className="material-symbols-outlined">menu</span>
              </button>
              <div className="relative">
                <details className="group">
                  <summary className="list-none cursor-pointer">
                    <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold hover:bg-primary-200 transition-colors">
                      JD
                    </div>
                  </summary>
                  <div className="absolute right-0 mt-2 w-48 bg-gray-700  rounded-md shadow-lg z-10 overflow-hidden group-open:animate-fadeIn">
                    <div className="py-1">
                      <a href="#" className="block px-4 py-2 hover:bg-gray-100 hover:text-black">
                        Profile
                      </a>
                      <a
                        href="#"
                        className="block px-4 py-2 hover:bg-neutral-100 hover:text-black"
                      >
                        Settings
                      </a>
                      <a
                        href="#"
                        className="block px-4 py-2 hover:bg-neutral-100 hover:text-black"
                      >
                        Help
                      </a>
                      <div className="border-t"></div>
                      <button onClick={handleLogout} className="block px-4 py-2 hover:bg-neutral-100 hover:text-black">
                        Logout
                      </button>
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-6 ">
          {/* Hero Section */}
          <section className="bg-gradient-to-r  rounded-xl p-8 mb-8 text-white">
            <div className="md:flex items-center justify-between">
              <div className="md:w-2/3 mb-6 md:mb-0">
                <h2 className="text-3xl font-bold mb-3">
                  Got a question? We've got answers!
                </h2>
                <p className="text-primary-100 mb-6">
                  Join our community of curious minds and get the answers you
                  need.
                </p>
                <div className="flex space-x-3">
                  <button className="bg-white text-black px-4 py-2 rounded-lg font-medium  transition-colors hover:bg-orange-500 hover:cursor-pointer">
                    Ask a Question
                  </button>
                  <button className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium border border-primary-400 hover:bg-primary-700 transition-colors">
                    Browse Questions
                  </button>
                </div>
              </div>
              <div className="md:w-1/3 flex justify-center bg-white rounded-xl">
                <img
                  src="https://illustrations.popsy.co/white/question-mark.svg"
                  alt="Question illustration"
                  className="w-48 h-48"
                />
                {/* Next: "Add animated illustration" */}
              </div>
            </div>
          </section>

          {/* Search Bar */}
          <div className="relative mb-8 text-black">
            <div className="flex bg-white rounded-lg shadow-sm overflow-hidden">
              <input
                type="text"
                placeholder="Search for questions..."
                className="w-full py-3 px-2 focus:outline-none"
              />
              <button className="bg-orange-500 hover:bg-orange-600 text-black px-6 font-medium hover:cursor-pointer ">
                Search
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 bg-gray-900 ">
            {/* Main Column */}
            <div className="lg:col-span-2 ">
              {/* Tabs */}
              <div className="border-b mb-6">
                <div className="flex space-x-6">
                  <button className="px-4 py-2 border-b-2 border-primary-600 font-medium text-white">
                    Latest
                  </button>
                  <button className="px-4 py-2 border-b-2 border-transparent hover:text-orange-500 hover:cursor-pointer">
                    Hot
                  </button>
                  <button className="px-4 py-2 border-b-2 border-transparent hover:text-orange-500 hover:cursor-pointer">
                    Most Answered
                  </button>
                  <button className="px-4 py-2 border-b-2 border-transparent hover:text-orange-500 hover:cursor-pointer">
                    Unanswered
                  </button>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-6  text-white">
                {/* Question Card */}
                <QuestionComponent question={sampleQuestion} />
                <div className="flex justify-center mt-8">
                  <button className="text-black flex items-center space-x-2 bg-orange-500 border border-gray-300 rounded-lg px-4 py-2 text-sm hover:bg-orange-600 hover:cursor-pointer">
                    <span>Load more questions</span>
                  </button>
                </div>
                {/* Next: "Add pagination controls" */}
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Ask Question Button */}

              {/* Topics */}
              <div className="bg-gray-700 p-6 rounded-lg shadow-sm">
                <h3 className="font-semibold mb-4">Popular Topics</h3>
              </div>

              {/* Top Contributors */}
              <div className="bg-gray-700 p-6 rounded-lg shadow-sm">
                <h3 className="font-semibold mb-4">Top Contributors</h3>
                
                <button className="w-full text-primary-600 text-sm mt-4 hover:underline hover:">
                  View all contributors
                </button>
              </div>

              {/* Recent Activity */}
              <div className="bg-gray-700 p-6 rounded-lg shadow-sm">
                <h3 className="font-semibold mb-4">Recent Activity</h3>
                
                <button className="w-full text-primary-600 text-sm mt-4 hover:underline">
                  View all activity
                </button>
              </div>
              {/* Next: "Add community stats widget" */}
            </div>
          </div>
        </main>

        {/* Footer */}
        
      </div>
    </div>
  );
}
