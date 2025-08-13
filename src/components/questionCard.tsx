import { MessageSquare, Share2, ThumbsUp } from "lucide-react";

export default function QuestionCard() {
  return (
    <div className="bg-black text-white border-b border-gray-800 p-4">
      {/* Tags */}
      <div className="flex gap-2 mb-2 flex-wrap">
        <span className="bg-orange-500 text-xs px-2 py-0.5 rounded">Physics</span>
        <span className="bg-orange-500 text-xs px-2 py-0.5 rounded">Electronics</span>
      </div>

      {/* Title */}
      <h2 className="text-lg font-semibold">Question Title Here</h2>
      <p className="text-gray-400 text-sm mt-1">
        The sun dipped behind the quiet hills as a cool breeze rustled through the leaves...
      </p>

      {/* Actions */}
      <div className="flex flex-wrap justify-between items-center mt-3 text-gray-400 text-xs gap-2">
        <div className="flex gap-4">
          <button className="flex items-center gap-1 hover:text-white">
            <ThumbsUp size={14} /> 12
          </button>
          <button className="flex items-center gap-1 hover:text-white">
            <MessageSquare size={14} /> 230
          </button>
          <button className="flex items-center gap-1 hover:text-white">
            <Share2 size={14} /> Share
          </button>
        </div>
        <div>
          <span>aryan26</span> • <span>863</span> • asked Aug 11 11:25
        </div>
      </div>
    </div>
  );
}
