"use client";
import Galaxy from "@/components/galaxy/page";
import TextType from '../components/text-type/page';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      {/* Galaxy Background */}
      <div className="absolute w-full h-screen">
        <Galaxy />
      </div>

      {/* Content Layer */}
      <div className="relative flex flex-col items-center justify-center w-1/2 h-1/2 text-white px-4 py-6 sm:py-10">
        {/* Navbar */}
        <nav className="fixed top-5 w-full max-w-7xl mx-auto px-4 py-3 backdrop-blur-md bg-white/10 border-b border-white/20 shadow-md text-white rounded-2xl">
          <div className="flex justify-between items-center">
            <h1 className="text-lg sm:text-xl font-bold">Uncluttered</h1>
            <div className="space-x-3 sm:space-x-4">
              <button className="hover:text-orange-500 transition hover:cursor-pointer">
                Signup
              </button>
              <button className="hover:text-orange-500 transition hover:cursor-pointer">
                Login
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="mt-24 sm:mt-32 text-center px-2 w-full">
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
            <button className="px-6 py-3 bg-white text-black font-medium rounded-full hover:bg-gray-200 hover:cursor-pointer transition">
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
