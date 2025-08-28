import { useEffect, useRef, useState } from "react";
import axios from "axios";
import MainHeader from "./heroHeader";
import QuestionCard from "@/components/questionCard";
import Comment from "@/components/comment/page";

export default function MainContent() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [quesLimit, setLimit] = useState(15);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);


  const scrollRef = useRef<HTMLDivElement>(null);
  const handleCommentClick = (id: string) => {
  
  setSelectedQuestionId(prev=>(prev==id?null:id));
};
  const fetchQuestions = async () => {
    if (!hasMore || loading) return;

    setLoading(true);
    try {
      const res = await axios.get("/api/fetchQuestion", {
        params: { after: nextCursor, limit: quesLimit },
      });
      console.log(res.data);
      setQuestions((prev) => [...prev, ...res.data.data]);
      setNextCursor(res.data.nextCursor);
      setHasMore(res.data.hasMore);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [quesLimit]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 5) {
      setLimit((prev) => prev + 1);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <main className="bg-black w-full text-white p-4 md:p-6 ">
      <div className="flex h-[85vh]">
        <div ref={scrollRef}
        className={`overflow-auto scrollbar-hide transition-all duration-300 ${
          selectedQuestionId?"w-2/3":"w-full"
        }`}
        > 
        <MainHeader  />
        {questions.map((q: any) => (
          <QuestionCard
            key={q._id}
            title={q.title}
            id={q._id}
            description={q.description}
            images={q.image}
            votes={q.votes}
            comments={q.comments}
            onCommentClick={handleCommentClick}

          />
        ))}
        
        {loading && <p>Loading...</p>}
        {!hasMore && <p>No more questions</p>}
        </div>
        {selectedQuestionId && 
        (
        <div className=" bg-amber-200">
          <Comment questionId={selectedQuestionId}/>
        </div>
        )}
      </div>
      
    </main>
  );
}
