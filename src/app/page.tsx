"use client";
import Galaxy from "@/components/uiComponent/galaxy/page";
import TextType from '@/components/uiComponent/text-type/page';
import { Book } from 'lucide-react';
import { useAuth0 } from '@auth0/auth0-react';
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "700"], 
});

export default function Home() {
  const { loginWithRedirect } = useAuth0();

  const handleLogin = () => {
    loginWithRedirect({
      authorizationParams: {
        screen_hint: 'login',
        returnTo: '/home'
      },
    });
  };

  const handleSignup = () => {
    loginWithRedirect({
      authorizationParams: {
        screen_hint: 'signup',
        returnTo:'/home'
      },
    });
  };

  return (
    <div className={`${montserrat.className} flex flex-col items-center justify-center h-screen`}>
      {/* Galaxy Background */}
      <div className="absolute w-full h-screen">
        <Galaxy />
      </div>

      {/* Content Layer */}
      <div className="relative flex flex-col items-center justify-center w-1/2 h-1/2 text-white px-4 py-6 sm:py-10 sm:flex flex-wrap">
        {/* Navbar */}
        <nav className="fixed top-15 w-1/2 max-w-7xl mx-auto px-10 py-5 backdrop-blur-md bg-white/10 border-b border-white/10 shadow-md text-white rounded-4xl border-2 ">
          <div className="flex justify-between items-center">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-lg">
              <Book color="white" className="w-4 h-4 sm:w-5 sm:h-5" />
                
            </div>
            <h1 className=" sm:block text-xl font-bold text-white pr-68">
                  Uncluttered
            </h1>
            
            <div className="space-x-3 sm:space-x-4 flex ">
              <button className="px-4 py-2 bg-white hover:bg-gray-200 rounded-full transition hover:cursor-pointer" onClick={handleLogin}>
                <span className="bg-gradient-to-br from-orange-500 to-red-500 bg-clip-text text-transparent font-medium">Login</span>
              </button>

              <button
                className="px-4 py-2 bg-gradient-to-br from-orange-500 to-red-500 font-medium text-white rounded-full transition  hover:from-orange-600 hover:to-red-600 hover:cursor-pointer "
                onClick={handleSignup}
              >
                SignUp
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="sm:mt-32 text-center px-2 w-full">
          <div className="text-2xl sm:text-4xl font-bold">
            <TextType
              text={["Uncluttered: Where Curiosity Meets Clarity — Ask Boldly, Solve Brilliantly"]}
              typingSpeed={75}
              pauseDuration={1500}
              showCursor={true}
              cursorCharacter="|"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-8 justify-center">
            <button className="px-6 py-3 bg-gradient-to-br from-orange-500 to-red-500  hover:from-orange-600 hover:to-red-600  text-white font-medium rounded-full hover:bg-orange-600 hover:cursor-pointer transition">
              Ask Doubt
            </button>
            <button className="px-6 py-3 bg-black/30 text-white font-medium rounded-full border border-white/20 hover:bg-white/10 transition hover:cursor-pointer">
              Solve Doubts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
