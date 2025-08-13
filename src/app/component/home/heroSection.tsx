import QuestionCard from "@/components/questionCard";
import MainHeader from "./heroHeader";
export default function MainContent() {
  return (
    <main className="flex-1 bg-black text-white p-4 md:p-6 overflow-auto">
     <MainHeader/>
      {/* Question List */}
      <QuestionCard />
      <QuestionCard />
    </main>
  );
}
