import { LayoutDashboard, Users, HelpCircle, LogOut } from "lucide-react";
import {User} from 'lucide-react'
import { useAuth0 } from "@auth0/auth0-react";
export default function Sidebar({ isOpen, onClose }: any) {
  
   const { logout } = useAuth0();
  return (
    <aside
      className={`bg-black text-white w-60 p-4 border-r border-gray-800 flex flex-col justify-between fixed md:static h-full top-0 left-0 z-50 transform ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } transition-transform duration-300 md:translate-x-0`}
    >
      <div>
        {/* User Info */}
        <div className="flex flex-col items-center gap-3 mb-6">
          
          <div className="flex items-center">
            <User/>
            <p className="font-bold text-sm">STUDENT</p>
          </div>
            <p className="text-gray-400 text-xs">User</p>
        </div>

        {/* Menu */}
        <nav className="space-y-2 flex flex-col">
          <a className="flex items-center gap-2 hover:text-orange-500" href="#">
            <LayoutDashboard size={18} /> Dashboard
          </a>
          <a className="flex items-center gap-2 hover:text-orange-500" href="#">
            <Users size={18} /> Communities
          </a>
          <a className="hover:text-orange-500" href="#">
            Answers
          </a>
          <a className="hover:text-orange-500" href="#">
            Schedules
          </a>

          <div className="">
            <p className="text-xs text-gray-500 mt-4 mb-2">Favorites</p>
            <div>
              <p className="text-xs text-gray-500 mt-4 mb-2">Favorites</p>

              <div className="pl-4 border-l border-gray-700 space-y-1">
                {["Physics", "Mathematics", "Chemistry", "Biology"].map(
                  (subject) => (
                    <a
                      key={subject}
                      href="#"
                      className="relative block pl-4 text-sm text-gray-300 hover:text-orange-500 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:border-t before:border-gray-700"
                    >
                      {subject}
                    </a>
                  )
                )}
              </div>
            </div>
          </div>
        </nav>
      </div>

      {/* Footer Links */}
      <div>
        <a
          href="#"
          className="flex items-center gap-2 text-gray-400 hover:text-white"
        >
          <HelpCircle size={18} /> Help
        </a>
        <button className="flex items-center gap-2 text-red-500 mt-2 hover:cursor-pointer"
        onClick={() =>
        logout({
          logoutParams: {
            returnTo: window.location.origin||"/",
          },
        })
      }>
          <LogOut size={18} /> Logout
        </button>
      </div>

      {/* Close Button on Mobile */}
      <button
        className="absolute top-2 right-2 md:hidden text-gray-400 hover:cursor-pointer"
        onClick={onClose}
      >
        ✖
      </button>
    </aside>
  );
}
