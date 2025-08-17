import {FunctionSquare,Leaf,Atom,FlaskConical,BookHeart,ChevronRight, LayoutDashboard,BookOpenCheck, Users, HelpCircle, LogOut, SettingsIcon, Menu, X } from "lucide-react";
import { useAuth0 } from "@auth0/auth0-react";
import { useUserStore } from "@/store/userStore";
import { useState, useEffect, useRef, useCallback } from "react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: SidebarProps) {
  const [open, setOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [tooltipTimer, setTooltipTimer] = useState<NodeJS.Timeout | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousWidthRef = useRef<number>(typeof window !== 'undefined' ? window.innerWidth : 1200);
  
  const subjects = [
    { name: "Physics", icon: Atom },
    { name: "Mathematics", icon: FunctionSquare},
    { name: "Chemistry", icon: FlaskConical },
    { name: "Biology", icon: Leaf },
  ];
  const [active, setActive] = useState<string | null>(null);

  const user = useUserStore((state) => state.user);
  const userName = user?.name;
  
  const { logout } = useAuth0();

  // Stable callback for toggle
  const handleAutoToggle = useCallback(() => {
    onToggleCollapse();
  }, [onToggleCollapse]);

  // Enhanced responsive behavior - SIMPLIFIED
  useEffect(() => {
    const currentWidth = window.innerWidth;
    const currentIsMobile = currentWidth < 768;
    setIsMobile(currentIsMobile);
    previousWidthRef.current = currentWidth;
    
    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newIsMobile = newWidth < 768;
      const wasIncreasing = newWidth > previousWidthRef.current;
      const wasDecreasing = newWidth < previousWidthRef.current;
      
      setIsMobile(newIsMobile);
      
      // Clear existing timeout
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      resizeTimeoutRef.current = setTimeout(() => {
        // Rule 1: Full window (desktop) → Sidebar should be open
        if (newWidth >= 768 && isCollapsed) {
          handleAutoToggle(); // Auto-open when reaching desktop size
        }
        // Rule 2: Decreasing window size → Auto-close if open
        else if (wasDecreasing && !isCollapsed) {
          handleAutoToggle(); // Auto-close when decreasing size
        }
        
        previousWidthRef.current = newWidth;
      }, 100);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [handleAutoToggle, isCollapsed]);

  // Reset accordion when collapsed
  useEffect(() => {
    if (isCollapsed) {
      setOpen(false);
      setActive(null);
    }
  }, [isCollapsed]);

  // Handle manual toggle - SIMPLIFIED
  const handleManualToggle = () => {
    // Clear any pending timeouts
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = null;
    }
    
    // Simple toggle without complex state tracking
    onToggleCollapse();
  };

  const handleTooltipShow = (item: string) => {
    if (isCollapsed) {
      const timer = setTimeout(() => {
        setShowTooltip(item);
      }, 500);
      setTooltipTimer(timer);
    }
  };

  const handleTooltipHide = () => {
    if (tooltipTimer) {
      clearTimeout(tooltipTimer);
      setTooltipTimer(null);
    }
    setShowTooltip(null);
  };

  // Handle toggle button tooltip
  const handleToggleTooltipShow = () => {
    const timer = setTimeout(() => {
      setShowTooltip('toggle');
    }, 500);
    setTooltipTimer(timer);
  };

  // Handle overlay click - only for mobile overlay mode
  const handleOverlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isMobile && !isCollapsed) {
      // Clear any pending timeouts before manual close
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;
      }
      setTimeout(() => {
        onToggleCollapse();
      }, 10);
    }
  };

  return (
    <>
      {/* Mobile Overlay with blur effect - only show when sidebar is expanded on mobile */}
      {isMobile && !isCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
          onClick={handleOverlayClick}
        />
      )}

      {/* Toggle Button - Outside sidebar, positioned relative to viewport */}
      <button
        onClick={handleManualToggle}
        className={`fixed top-[20%] -translate-y-1/2 bg-black border border-gray-800 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-900 hover:border-gray-600 transition-all duration-300 z-[60] shadow-lg ${
          isCollapsed ? 'left-12' : 'left-56'
        }`}
        onMouseEnter={handleToggleTooltipShow}
        onMouseLeave={handleTooltipHide}
      >
        <ChevronRight 
          size={16} 
          className={`transform transition-transform duration-300 ${isCollapsed ? 'rotate-0' : 'rotate-180'}`}
        />
      </button>

      {/* Toggle Button Tooltip */}
      {showTooltip === 'toggle' && !isMobile && (
        <div 
          className={`fixed top-[20%] -translate-y-1/2 bg-gray-800 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap z-[70] shadow-lg ${
            isCollapsed ? 'left-20' : 'left-64'
          }`}
        >
          {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          <div className="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={`bg-black text-white border-r border-gray-800 flex flex-col justify-between h-full top-0 left-0 z-50 transition-all duration-300 ${
          // Mobile: fixed when expanded (overlay), static when collapsed (icons only)
          // Desktop: always static
          isMobile ? (isCollapsed ? "static" : "fixed") : "static"
        } ${
          // Width: collapsed = w-16 (icons), expanded = w-60 (full)
          isCollapsed ? "w-16" : "w-60"
        }`}
      >


        <div className={isCollapsed ? "p-2" : "p-4"}>
          {/* User Info - Full */}
          {!isCollapsed && (
            <div className="flex flex-col items-center gap-3 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                  <img src={user?.picture} alt="profile" className="w-10 h-10 rounded-full object-cover" />
                </div>
                <p className="font-bold text-sm">{userName}</p>
              </div>
              <div className="w-full h-[1px] bg-gray-500"></div>
            </div>
          )}

          {/* User Info - Collapsed (Icons only) */}
          {isCollapsed && (
            <div className="flex flex-col items-center mb-6">
              <div 
                className="relative w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center"
                onMouseEnter={() => handleTooltipShow('profile')}
                onMouseLeave={handleTooltipHide}
              >
                <img src={user?.picture} alt="profile" className="w-10 h-10 rounded-full object-cover" />
                {showTooltip === 'profile' && !isMobile && (
                  <div className="absolute left-14 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap z-10 shadow-lg">
                    {userName}
                    <div className="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
                  </div>
                )}
              </div>
              <div className="w-full h-[1px] bg-gray-500 mt-3"></div>
            </div>
          )}

          {/* Menu */}
          <nav className="space-y-2 flex flex-col">
            {/* Main Section Header */}
            {!isCollapsed && (
              <div className="w-full bg-black px-1 py-0.25 pb-4">
                <p className="text-gray-400 text-xs tracking-wider font-semibold">
                  Main
                </p>
              </div>
            )}

            {/* Dashboard */}
            <div className="relative">
              <a 
                className={`flex items-center gap-2 hover:text-orange-500 transition-colors ${
                  isCollapsed ? "justify-center py-3 px-2" : "px-2.5 py-2"
                }`}
                href="#"
                onMouseEnter={() => handleTooltipShow('dashboard')}
                onMouseLeave={handleTooltipHide}
              >
                <LayoutDashboard size={18} />
                {!isCollapsed && <span>Dashboard</span>}
              </a>
              {isCollapsed && showTooltip === 'dashboard' && !isMobile && (
                <div className="absolute left-14 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap z-10 shadow-lg">
                  Dashboard
                  <div className="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
                </div>
              )}
            </div>

            {/* Communities */}
            <div className="relative">
              <a 
                className={`flex items-center gap-2 hover:text-orange-500 transition-colors ${
                  isCollapsed ? "justify-center py-3 px-2" : "px-2.5 py-2"
                }`}
                href="#"
                onMouseEnter={() => handleTooltipShow('communities')}
                onMouseLeave={handleTooltipHide}
              >
                <Users size={18} />
                {!isCollapsed && <span>Communities</span>}
              </a>
              {isCollapsed && showTooltip === 'communities' && !isMobile && (
                <div className="absolute left-14 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap z-10 shadow-lg">
                  Communities
                  <div className="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
                </div>
              )}
            </div>

            {/* Answers */}
            <div className="relative">
              <a 
                className={`flex items-center gap-2 hover:text-orange-500 transition-colors ${
                  isCollapsed ? "justify-center py-3 px-2" : "px-2.5 py-2"
                }`}
                href="#"
                onMouseEnter={() => handleTooltipShow('answers')}
                onMouseLeave={handleTooltipHide}
              >
                <BookOpenCheck size={18} />
                {!isCollapsed && <span>Answers</span>}
              </a>
              {isCollapsed && showTooltip === 'answers' && !isMobile && (
                <div className="absolute left-14 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap z-10 shadow-lg">
                  Answers
                  <div className="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
                </div>
              )}
            </div>

            <div className="w-full h-[1px] bg-gray-500 my-4"></div>

            {/* Favorites Section - Full */}
            {!isCollapsed && (
              <div>
                <p className="text-gray-400 text-xs tracking-wider font-semibold pb-4">
                  Favorites
                </p>

                {/* Collapsible list */}
                <div className="mt-1">
                  {/* Toggle button */}
                  <button onClick={() => {
                    if (open) {
                      // reset active when closing
                      setActive(null);
                    }
                    setOpen(!open);
                  }}
                    className="flex items-center justify-between w-full hover:text-orange-500 px-2.5 py-2 rounded-md transition-colors"
                  >
                    {/* Left part: icon + text */}
                    <span className="flex items-center gap-2 pl-1">
                      <BookHeart size={18} className="opacity-80" />
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
                          <button onClick={() => setActive(subject.name)} className={`flex w-full items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium   transition-all${active === subject.name? " bg-zinc-800 text-orange-400 shadow-md shadow-black/30": " hover:bg-zinc-800/70 hover:text-orange-400"}`}>
                            <subject.icon size={16} className="opacity-80" />
                            <span>{subject.name}</span>
                          </button>
                       </li>
                     ))}
                   </ul>
                 </div>
               </div>
              </div>
            )}

            {/* Favorites Section - Collapsed (Icons) */}
            {isCollapsed && (
              <div className="relative">
                <div 
                  className="flex justify-center py-3 px-2 hover:text-orange-500 transition-colors cursor-pointer"
                  onMouseEnter={() => handleTooltipShow('subjects')}
                  onMouseLeave={handleTooltipHide}
                >
                  <BookHeart size={18} className="opacity-80" />
                </div>
                {showTooltip === 'subjects' && !isMobile && (
                  <div className="absolute left-14 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap z-10 shadow-lg">
                    Subjects
                    <div className="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
                  </div>
                )}
              </div>
            )}

            <div className="w-full h-[1px] bg-gray-500 my-4"></div>

            {/* Settings Section Header */}
            {!isCollapsed && (
              <div>
                <p className="text-gray-400 text-xs tracking-wider font-semibold pb-4">
                  Settings
                </p>
              </div>
            )}

            {/* Settings */}
            <div className="relative">
              <a 
                className={`flex items-center gap-2 hover:text-orange-500 transition-colors ${
                  isCollapsed ? "justify-center py-3 px-2" : "px-2.5 py-2"
                }`}
                href="#"
                onMouseEnter={() => handleTooltipShow('settings')}
                onMouseLeave={handleTooltipHide}
              >
                <SettingsIcon size={18} />
                {!isCollapsed && <span>Settings</span>}
              </a>
              {isCollapsed && showTooltip === 'settings' && !isMobile && (
                <div className="absolute left-14 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap z-10 shadow-lg">
                  Settings
                  <div className="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Footer Links */}
        <div className={isCollapsed ? "p-2" : "p-4"}>
          {/* Help */}
          <div className="relative">
            <a
              href="#"
              className={`flex items-center gap-2 text-gray-400 hover:text-white transition-colors ${
                isCollapsed ? "justify-center py-2" : ""
              }`}
              onMouseEnter={() => handleTooltipShow('help')}
              onMouseLeave={handleTooltipHide}
            >
              <HelpCircle size={18} />
              {!isCollapsed && <span>Help</span>}
            </a>
            {isCollapsed && showTooltip === 'help' && !isMobile && (
              <div className="absolute left-14 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap z-10 shadow-lg">
                Help
                <div className="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
              </div>
            )}
          </div>
          
          {/* Logout */}
          <div className="relative">
            <button 
              className={`flex items-center gap-2 text-red-500 mt-2 hover:cursor-pointer transition-colors hover:text-red-400 ${
                isCollapsed ? "justify-center py-2" : ""
              }`}
              onClick={() =>
                logout({
                  logoutParams: {
                    returnTo: window.location.origin||"/",
                  },
                })
              }
              onMouseEnter={() => handleTooltipShow('logout')}
              onMouseLeave={handleTooltipHide}
            >
              <LogOut size={18} />
              {!isCollapsed && <span>Logout</span>}
            </button>
            {isCollapsed && showTooltip === 'logout' && !isMobile && (
              <div className="absolute left-14 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap z-10 shadow-lg">
                Logout
                <div className="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}