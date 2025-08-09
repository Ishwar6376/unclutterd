"use client";
import Galaxy from "@/components/galaxy/page";
import TextType from '../components/text-type/page';
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
        <nav className="fixed top-15 w-1/2 max-w-7xl mx-auto px-10 py-5 backdrop-blur-md bg-white/10 border-b border-white/10 shadow-md text-white rounded-4xl border-2 border-white">
          <div className="flex justify-between items-center">
            <h1 className="text-lg sm:text-xl font-bold flex "><Book color="#f97316" /> Uncluttered</h1>
            <div className="space-x-3 sm:space-x-4">
              <button
                className="px-4 py-2 bg-white  hover:bg-orange-100 font-medium text-orange-500 rounded-full transition hover:cursor-pointer"
                onClick={handleSignup}
              >
                Log in
              </button>
              <button
                className="px-4 py-2 bg-orange-500  hover:bg-orange-600 font-medium text-white rounded-full transition hover:cursor-pointer "
                onClick={handleLogin}
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
              text={["Unclutter: Where Curiosity Meets Clarity — Ask Boldly, Solve Brilliantly"]}
              typingSpeed={75}
              pauseDuration={1500}
              showCursor={true}
              cursorCharacter="|"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-8 justify-center">
            <button className="px-6 py-3 bg-orange-500 text-white font-medium rounded-full hover:bg-orange-600 hover:cursor-pointer transition">
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
