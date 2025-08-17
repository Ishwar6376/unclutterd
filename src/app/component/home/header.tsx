'use client';
import { Sun, Bell, User, Search, Menu, Plus, MessageSquare, Home, TrendingUp, ChevronDown, Moon } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Book } from "lucide-react";
import { useUserStore } from "@/store/userStore";

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  const user=useUserStore((state)=>state.user);
  const username=user?.name
  const userpicture=user?.picture
  const handleProfileClick = () => {
    router.push("/profile");
  }
  const [showSearch, setShowSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isDark, setIsDark] = useState(true);

  return (
    <header className="sticky top-0 z-50 bg-gray-900 border-b border-gray-700 shadow-lg">
      <div className="flex items-center justify-between px-3 sm:px-4 lg:px-6 py-2 max-w-full">
        {/* Left Section - Logo + Menu */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-shrink-0">
          {/* Mobile Menu */}
          {onMenuClick && (
            <button 
              onClick={onMenuClick}
              className="lg:hidden p-2 hover:bg-gray-800 rounded-full transition-colors"
            >
              <Menu size={20} className="text-gray-300" />
            </button>
          )}

          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-lg">
              <Book color="white" className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h1 className="hidden sm:block text-xl font-bold text-white">
              Uncluttered
            </h1>
          </div>

          {/* Navigation Pills - Desktop */}
          <div className="hidden lg:flex items-center ml-4 space-x-1">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-600 rounded-full text-sm font-medium text-white hover:bg-gray-700 transition-colors">
              <Home size={16} />
              Home
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
              <TrendingUp size={16} />
              Popular
            </button>
          </div>
        </div>

        {/* Center - Search Bar */}
        <div className="hidden md:flex flex-1 max-w-2xl mx-4">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search Uncluttered"
              className="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-full bg-gray-800 text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 hover:bg-gray-750 transition-colors"
            />
          </div>
        </div>

        {/* Mobile Search Button */}
        <button 
          className="md:hidden p-2 hover:bg-gray-800 rounded-full transition-colors"
          onClick={() => setShowSearch(!showSearch)}
        >
          <Search size={20} className="text-gray-300" />
        </button>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Popular/Trending (mobile icon) */}
          <button className="lg:hidden p-2 hover:bg-gray-800 rounded-full transition-colors">
            <TrendingUp size={20} className="text-gray-300" />
          </button>

          {/* Create Post */}
          <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full font-medium text-sm hover:from-orange-600 hover:to-red-600 transition-all shadow-lg">
            <Plus size={16} />
            <span className="hidden lg:inline">Create</span>
          </button>

          {/* Create Post Mobile */}
          <button className="sm:hidden p-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-full transition-all shadow-lg">
            <Plus size={18} className="text-white" />
          </button>

          {/* Chat/Messages */}
          <button className="p-2 hover:bg-gray-800 rounded-full transition-colors relative">
            <MessageSquare size={20} className="text-gray-300" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-gray-900"></span>
          </button>

          {/* Notifications */}
          <button className="p-2 hover:bg-gray-800 rounded-full transition-colors relative">
            <Bell size={20} className="text-gray-300" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-gray-900"></span>
          </button>

          {/* Theme Toggle */}
          <button 
            className="hidden sm:block p-2 hover:bg-gray-800 rounded-full transition-colors"
            onClick={() => setIsDark(!isDark)}
          >
            {isDark ? (
              <Sun size={20} className="text-yellow-400" />
            ) : (
              <Moon size={20} className="text-gray-300" />
            )}
          </button>

          {/* User Menu */}
          <div className="relative">
            <button 
              className="flex items-center gap-2 p-1 pr-2 hover:bg-gray-800 rounded-full transition-colors"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <img src={user?.picture} alt="profile" className="w- h-8 rounded-full object-cover" />
              </div>
              <div className="hidden lg:flex flex-col items-start">
                <span className="text-xs font-medium text-white">{username}</span>
                <span className="text-xs text-gray-400">1,234 karma</span>
              </div>
              <ChevronDown size={16} className="hidden lg:block text-gray-400" />
            </button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 top-12 w-64 bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-600">
                  <div className="font-medium text-white">u/username</div>
                  <div className="text-sm text-gray-400">1,234 karma</div>
                </div>
                <button className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm text-gray-200 transition-colors" onClick={handleProfileClick}>
                  <div className="flex items-center gap-3">
                    <User size={16} />
                    Profile
                  </div>
                </button>
                <button className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm text-gray-200 transition-colors">
                  <div className="flex items-center gap-3">
                    {isDark ? <Sun size={16} /> : <Moon size={16} />}
                    {isDark ? 'Light Mode' : 'Dark Mode'}
                  </div>
                </button>
                <button className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm text-gray-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-4 h-4 text-center">⚙️</span>
                    Settings
                  </div>
                </button>
                <hr className="my-1 border-gray-600" />
                <button className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm text-red-400 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-4 h-4 text-center">🚪</span>
                    Log Out
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search Overlay */}
      {showSearch && (
        <div className="md:hidden border-t border-gray-700 bg-gray-800 p-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search Uncluttered"
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-600 rounded-lg bg-gray-700 text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowUserMenu(false)}
        ></div>
      )}
    </header>
  );
}