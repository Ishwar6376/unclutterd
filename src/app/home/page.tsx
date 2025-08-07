import React from "react";
import { Book, Bell } from "lucide-react";
import GlareHover from "@/components/glareHover/page";

export default function Home() {
  return (
    <div id="webcrumbs">
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
                      <a
                        href="#"
                        className="block px-4 py-2 hover:bg-neutral-100 hover:text-black"
                      >
                        Sign out
                      </a>
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-6">
          {/* Hero Section */}
          <section className="bg-gradient-to-r from-primary-500 to-primary-700 rounded-xl p-8 mb-8 text-white">
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
          <div className="relative mb-8">
            <div className="flex bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="flex items-center px-3 text-gray-400">
                <span className="material-symbols-outlined">search</span>
              </div>
              <input
                type="text"
                placeholder="Search for questions..."
                className="w-full py-3 px-2 focus:outline-none"
              />
              <button className="bg-primary-600 text-white px-6 font-medium hover:bg-primary-700 transition-colors">
                Search
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Column */}
            <div className="lg:col-span-2">
              {/* Tabs */}
              <div className="border-b mb-6">
                <div className="flex space-x-6">
                  <button className="px-4 py-2 border-b-2 border-primary-600 font-medium text-primary-600">
                    Latest
                  </button>
                  <button className="px-4 py-2 border-b-2 border-transparent hover:text-primary-600 transition-colors">
                    Hot
                  </button>
                  <button className="px-4 py-2 border-b-2 border-transparent hover:text-primary-600 transition-colors">
                    Most Answered
                  </button>
                  <button className="px-4 py-2 border-b-2 border-transparent hover:text-primary-600 transition-colors">
                    Unanswered
                  </button>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-6">
                {/* Question Card */}

                <div className="flex justify-center mt-8">
                  <button className="text-black flex items-center space-x-2 bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm hover:bg-gray-50 transition-colors">
                    <span>Load more questions</span>
                  </button>
                </div>
                {/* Next: "Add pagination controls" */}
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Ask Question Button */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <button className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium flex items-center justify-center space-x-2 hover:bg-primary-700 transition-colors">
                  <span className="material-symbols-outlined">add_circle</span>
                  <span>Ask a Question</span>
                </button>
              </div>

              {/* Topics */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-semibold mb-4">Popular Topics</h3>
              </div>

              {/* Top Contributors */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-semibold mb-4">Top Contributors</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
                      JD
                    </div>
                    <div>
                      <div className="font-medium">John Doe</div>
                      <div className="text-xs text-gray-500">
                        352 contributions
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold">
                      AS
                    </div>
                    <div>
                      <div className="font-medium">Alice Smith</div>
                      <div className="text-xs text-gray-500">
                        293 contributions
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-semibold">
                      RJ
                    </div>
                    <div>
                      <div className="font-medium">Robert Johnson</div>
                      <div className="text-xs text-gray-500">
                        247 contributions
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-semibold">
                      EW
                    </div>
                    <div>
                      <div className="font-medium">Emily Wilson</div>
                      <div className="text-xs text-neutral-500">
                        189 contributions
                      </div>
                    </div>
                  </div>
                </div>
                <button className="w-full text-primary-600 text-sm mt-4 hover:underline">
                  View all contributors
                </button>
              </div>

              {/* Recent Activity */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  <div className="border-l-2 border-green-500 pl-3 py-1">
                    <div className="text-sm">John answered a question</div>
                    <a
                      href="#"
                      className="text-xs text-gray-500 hover:text-primary-600 transition-colors"
                    >
                      How to use CSS Grid for responsive layouts?
                    </a>
                    <div className="text-xs text-gray-400">5 minutes ago</div>
                  </div>
                  <div className="border-l-2 border-blue-500 pl-3 py-1">
                    <div className="text-sm">Sarah asked a question</div>
                    <a
                      href="#"
                      className="text-xs text-gray-500 hover:text-primary-600 transition-colors"
                    >
                      Best practices for API error handling in Node.js?
                    </a>
                    <div className="text-xs text-gray-400">20 minutes ago</div>
                  </div>
                  <div className="border-l-2 border-purple-500 pl-3 py-1">
                    <div className="text-sm">Robert commented</div>
                    <a
                      href="#"
                      className="text-xs text-neutral-500 hover:text-primary-600 transition-colors"
                    >
                      How to optimize webpack build times?
                    </a>
                    <div className="text-xs text-gray-400">1 hour ago</div>
                  </div>
                </div>
                <button className="w-full text-primary-600 text-sm mt-4 hover:underline">
                  View all activity
                </button>
              </div>
              {/* Next: "Add community stats widget" */}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t mt-12 py-8">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <span className="material-symbols-outlined text-primary-600 text-2xl">
                    help_center
                  </span>
                  <h2 className="text-xl font-bold">QueryQuest</h2>
                </div>
                <p className="text-gray-600 text-sm">
                  The community-driven platform for asking and answering
                  programming questions.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Platform</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>
                    <a
                      href="#"
                      className="hover:text-primary-600 transition-colors"
                    >
                      Questions
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="hover:text-primary-600 transition-colors"
                    >
                      Users
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="hover:text-primary-600 transition-colors"
                    >
                      Tags
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="hover:text-primary-600 transition-colors"
                    >
                      Badge
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Company</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>
                    <a
                      href="#"
                      className="hover:text-primary-600 transition-colors"
                    >
                      About
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="hover:text-primary-600 transition-colors"
                    >
                      Blog
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="hover:text-primary-600 transition-colors"
                    >
                      Careers
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="hover:text-primary-600 transition-colors"
                    >
                      Contact
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Support</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>
                    <a
                      href="#"
                      className="hover:text-primary-600 transition-colors"
                    >
                      Help Center
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="hover:text-primary-600 transition-colors"
                    >
                      Terms of Service
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="hover:text-primary-600 transition-colors"
                    >
                      Privacy Policy
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="hover:text-primary-600 transition-colors"
                    >
                      Cookie Policy
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="border-t mt-8 pt-6 flex flex-col md:flex-row justify-between items-center">
              <div className="text-sm text-gray-500 mb-4 md:mb-0">
                © 2023 QueryQuest. All rights reserved.
              </div>
              <div className="flex space-x-4">
                <a
                  href="#"
                  className="p-2 rounded-full hover:bg-neutral-100 transition-colors"
                >
                  <i className="fa-brands fa-twitter text-gray-600"></i>
                </a>
                <a
                  href="#"
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <i className="fa-brands fa-facebook text-gray-600"></i>
                </a>
                <a
                  href="#"
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <i className="fa-brands fa-github text-gray-600"></i>
                </a>
                <a
                  href="#"
                  className="p-2 rounded-full hover:bg-neutral-100 transition-colors"
                >
                  <i className="fa-brands fa-linkedin text-neutral-600"></i>
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
