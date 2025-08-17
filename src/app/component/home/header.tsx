'use client';
import { Sun, Bell, User, Search, Menu } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Book } from "lucide-react";


export default function Header({ onMenuClick }:any) {
  const router = useRouter();
  const handleProfileClick = () => {
    router.push("/profile");
  }
  const [showSearch, setShowSearch] = useState(false);

  return (
    <header className="flex items-center justify-between bg-black text-white px-4 py-2 border-b border-gray-800">
      {/* Left - Logo + Menu */}
      <div className="flex items-center gap-5">
        {/* Mobile Menu */}
        <button className="md:hidden hover:cursor-pointer" onClick={onMenuClick}>
          <Menu />
        </button>

        <h1 className="flex text-white font-bold text-lg"><Book color="#f97316" /> Uncluttered</h1>
      </div>

      {/* Search */}
      <div className="hidden md:block relative  ">
        <input
          type="text"
          placeholder="Search Uncluttered"
          className="bg-gray-900 text-white px-3 py-1 rounded-full pl-8 focus:outline-none w-90"
        />
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
      </div>

      {/* Mobile Search Button */}
      <button className="md:hidden" onClick={() => setShowSearch(!showSearch)}>
        <Search />
      </button>

      {/* Right Icons */}
      <div className="flex items-center gap-4">
        <Sun className="cursor-pointer" />
        <Bell className="cursor-pointer" />
        <User className="cursor-pointer"  onClick={handleProfileClick}/>
      </div>

      {/* Mobile Search Overlay */}
      {showSearch && (
        <div className="absolute top-14 left-0 w-full bg-black p-2 md:hidden">
          <input
            type="text"
            placeholder="Search Uncluttered"
            className="bg-gray-900 text-white px-3 py-2 rounded w-full"
          />
        </div>
      )}
    </header>
  );
}
