import {FunctionSquare,Leaf,Atom,FlaskConical,BookHeart,ChevronRight, LayoutDashboard,BookOpenCheck, Users, HelpCircle, LogOut, SettingsIcon } from "lucide-react";
import { useAuth0 } from "@auth0/auth0-react";
import { useUserStore } from "@/store/userStore";
import { useState } from "react";
export default function Sidebar({ isOpen, onClose }: any) {
  const [open, setOpen] = useState(false);
  const subjects = [
    { name: "Physics", icon: Atom },
    { name: "Mathematics", icon: FunctionSquare},
    { name: "Chemistry", icon: FlaskConical },
    { name: "Biology", icon: Leaf },
  ];
  const [active, setActive] = useState<string | null>(null);

  const user=useUserStore((state)=>state.user)
  const userName=user?.name;
  
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
          
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-gray-300 flex item-center justify-center ">
              {<img src={user?.picture} alt="profile" className="w-10 h-10 rounded-full object-cover "/>}
            </div>
            <p className="font-bold text-sm">{userName}</p>
          </div>
          <div className="w-full h-[1px] bg-gray-500"></div>

        </div>

        {/* Menu */}
        <nav className="space-y-2 flex flex-col">
          <div className="w-full bg-black px-1 py-0.25 pb-4">
            <p className="text-gray-400 text-xs tracking-wider font-semibold ">
              Main
            </p>
          </div>

          <a className="flex items-center gap-2 hover:text-orange-500 px-2.5 pb-4" href="#" >
            <LayoutDashboard size={18} /> Dashboard
          </a>
          <a className="flex items-center gap-2 hover:text-orange-500 px-2.5 pb-4" href="#">
            <Users size={18} /> Communities
          </a>
          <a className="flex items-center gap-2 hover:text-orange-500 px-2.5 pb-4" href="#"><BookOpenCheck size={18} />
            Answers
          </a>
          <div className="w-full h-[1px] bg-gray-500 "></div>
          <div>
            <p className="text-gray-400 text-xs tracking-wider font-semibold pt-4 pb-4">
              Favorites
            </p>

            {/* Collapsible list */}
            <div className="mt-1">
              {/* Toggle button */}
              <button onClick={() => {if (open) {
                // reset active when closing
                setActive(null);}
                setOpen(!open);}}
                className="flex items-center justify-between w-full hover:text-orange-500 px-2.5 py-2 rounded-md transition-colors"
                >
                {/* Left part: icon + text */}
                <span className="flex items-center gap-2 pl-1"><BookHeart size={18} className="opacity-80" />
                  <span className="font-medium">Subjects</span>
                </span>
                {/* Right arrow */}
                <ChevronRight className={`h-4 w-4 transform transition-transform duration-300 ${open ? "rotate-90" : ""}`}/>
              </button>

              {/* Collapsible subject list */}
              <div className={`overflow-hidden transition-all duration-500 ease-in-out ${open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
                <ul className="ml-4 mt-2 space-y-1">
                  {subjects.map((subject, idx) => (
                    <li key={subject.name} className={`transform transition-all duration-500 ${open? "translate-x-0 opacity-100 delay-" + idx * 100: "-translate-x-2 opacity-0"}`}>
                      <button onClick={() => setActive(subject.name)} className={`flex w-full items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium   transition-all${active === subject.name? "bg-zinc-800 text-orange-400 shadow-md shadow-black/30": "hover:bg-zinc-800/70 hover:text-orange-400"}`}>
                        <subject.icon size={16} className="opacity-80" />
                        <span>{subject.name}</span>
                      </button>
                   </li>
                 ))}
               </ul>
             </div>
           </div>

          </div>
          <div className="w-full h-[1px] bg-gray-500 "></div>
          <div>
            <p className="text-gray-400 text-xs tracking-wider font-semibold pt-4 pb-4">
              Settings
            </p>
          </div>
          <a className="flex items-center gap-2 hover:text-orange-500 px-2.5 pb-4" href="#">
            <SettingsIcon size={18} /> Settings
          </a>


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
