"use client";
import { useRef, useState } from "react";
import { MessageCircle,ArrowBigUp, ArrowBigDown, ChevronLeft, ChevronRight, X } from "lucide-react";
type Comments={
  id:string;
  author:string;
  text:string;
  createdAt:Date;
  votes?:number;
  replies?:Comment[];
}
type Props = {
  id:string;
  title: string;
  description: string;
  images?: string[];
  votes?: number;
  onCommentClick: (id: string) => void;
  comments?:Comments[];
};

export default function QuestionCard({ id,title, description, images = [], votes = 0 ,comments = [],
  onCommentClick}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [vote, setVote] = useState<"up" | "down" | null>(null);

  // Scroll function
  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === "left" ? -300 : 300,
        behavior: "smooth",
      });
    }
  };

  return (
    <>
      <article className=" rounded-2xl p-5 mb-4 shadow-md border border-gray-800 
                          hover:shadow-lg hover:border-orange-500 transition-all duration-300 w-full ">
        {/* Title */}
        <h3 className="font-semibold text-lg text-orange-400">{title}</h3>

        {/* Description */}
        {description && <p className="text-sm mt-2 text-gray-300 leading-relaxed">{description}</p>}

        {/* Images */}
        {images.length > 0 && (
          <div className="relative mt-4">
            {/* Scroll Buttons */}
            <button
              onClick={() => scroll("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 bg-gray-800/70 hover:bg-gray-700 text-white p-2 rounded-full z-10"
            >
              <ChevronLeft />
            </button>
            <button
              onClick={() => scroll("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 bg-gray-800/70 hover:bg-gray-700 text-white p-2 rounded-full z-10"
            >
              <ChevronRight />
            </button>

            <div
              ref={scrollRef}
              className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth"
            >
              {images.map((image, idx) => (
                <img
                  key={idx}
                  src={image}
                  alt={`Image ${idx}`}
                  onClick={() => setSelectedImage(image)}
                  className="w-100 h-100 object-cover rounded cursor-pointer "
                />
              ))}
            </div>
          </div>
        )}

        {/* Votes */}
        <div className="text-xs mt-3 text-gray-400 flex items-center gap-3">
          {/* Upvote + Downvote in same pill */}
          <div className="flex items-center gap-2 bg-gray-800 px-3 py-2 rounded-full">
            {/* Upvote */}
            <ArrowBigUp
              onClick={() => setVote(vote === "up" ? null : "up")}
              className={`w-5 h-5 cursor-pointer transition 
              ${
                vote === "up"
                  ? "text-orange-500"
                  : "text-gray-300 hover:text-orange-400"
              }`}
            />

            {/* Vote Count */}
            <span className="text-white font-medium">{votes}</span>

            {/* Downvote */}
            <ArrowBigDown onClick={() => setVote(vote === "down" ? null : "down")}
              className={`w-5 h-5 cursor-pointer transition 
              ${
                vote === "down"
                ? "text-purple-500"
                : "text-gray-300 hover:text-purple-400"
              }`}
            />
          </div>

          {/* Comments */}
          <div className="flex items-center gap-2 bg-gray-800 px-3 py-2 rounded-full cursor-pointer hover:bg-gray-700 transition " onClick={()=>onCommentClick(id)}>
            <MessageCircle className="w-5 h-5 text-gray-300" />
            <span className="text-white font-medium">{comments.length??0}</span>
        </div>
      </div>


      </article>

      {/* Modal for Enlarged Image */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50">
          <div className="relative">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 bg-gray-900/80 hover:bg-gray-700 text-white p-2 rounded-full hover:cursor-pointer"
            >
              <X />
            </button>
            <img
              src={selectedImage}
              alt="Enlarged"
              className=" w-[800px] h-[800px] rounded-xl shadow-lg sm:w-[400px] sm:h-[400px] "
            />
          </div>
        </div>
      )}
    </>
  );
}
