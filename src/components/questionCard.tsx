"use client";
import { useEffect, useState } from "react";
import axios from "axios";
interface Question {
  _id: string;
  title: string;
  description: string;
}

export default function QuestionsFeed() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [after, setAfter] = useState<string | null>();
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    async function fetchLatestId() {
      const res = await axios.get("/api/findDBID");
      setAfter(res.data.latestId);
    }
    fetchLatestId();
  }, []);

  async function fetchQuestions() {
    if (loading) return;
    setLoading(true);
    console.log("After", after);
    const res = await axios.get(`/api/fetchQuestion?after=${after}`);
    setLoading(false);
    setQuestions(res.data.question)
    console.log(res);
  }

  useEffect(() => {
    if (!after) return; 

    fetchQuestions();

    
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
        document.body.offsetHeight - 300
      ) {
        fetchQuestions();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [after]);

  return (
    <div className="max-w-2xl mx-auto p-4">
      {questions.map((q) => (
        <div key={q._id} className="border-b py-4">
          <h2 className="text-xl font-bold">{q.title}</h2>
          <p>{q.description}</p>
        </div>
      ))}
      {loading && <p className="text-center">Loading...</p>}
    </div>
  );
}
