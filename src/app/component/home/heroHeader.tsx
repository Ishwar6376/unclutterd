import { useRouter } from "next/navigation";

export default function MainHeader() {
  const router=useRouter();
  return (
    <div>
      {/* Title & Ask Question Button */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h1 className="text-xl font-bold">Newest Questions</h1>
        <button onClick={()=>{router.push("/ask")}}className="bg-orange-500 px-4 py-1 rounded hover:bg-orange-600 transition-colors">
          Ask Questions
        </button>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-4 ">
        {["Newest", "Active", "Bountied", "Unanswered"].map((filter) => (
          <button
            key={filter}
            className="bg-gray-800 px-3 py-1 rounded hover:bg-gray-700 transition-colors hover:cursor-pointer"
          >
            {filter}
          </button>
        ))}
      </div>
    </div>
  );
}
