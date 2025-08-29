"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";

export default function UserDashboard() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("questions");

  useEffect(() => {
    if (!id) return;

    const fetchUser = async () => {
      try {
        const res = await axios.get(`/api/getUser?id=${id}`);
        console.log(res.data);
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id]);

  if (loading) return <p className="p-6">Loading...</p>;
  if (!data) return <p className="p-6 text-red-50">User not found</p>;

  const { userPersonal, userQ } = data;

  return (
    <div className=" max-w-5xl mx-auto p-6 space-y-6  min-h-screen" >
      {/* Profile Card */}
      <div className="bg-gray-700 shadow-lg rounded-2xl p-6 flex items-center space-x-6 border border-gray-200 ">
        <img
          src={userPersonal.avatar || "/default-avatar.png"}
          alt={userPersonal.username}
          className="w-24 h-24 rounded-full border-4 border-orange-500"
        />
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-orange-50">{userPersonal.username}</h1>
          <p className="text-white flex items-center space-x-2">
            <span>📧</span> <span>{userPersonal.email}</span>
          </p>
          <p className="text-sm text-gray-400">
            Joined on {new Date(userPersonal.createdAt).toLocaleDateString()}
          </p>

          {/* Stats */}
          <div className="flex space-x-6 mt-4 text-center">
            <div>
              <p className="text-lg font-bold text-orange-600">{userQ.questionsData?.length || 0}</p>
              <p className="text-sm text-gray-50">Questions</p>
            </div>
            <div>
              <p className="text-lg font-bold text-orange-600">{userQ.answersData?.length || 0}</p>
              <p className="text-sm text-gray-50">Answers</p>
            </div>
            <div>
              <p className="text-lg font-bold text-orange-600">{userQ.commentsData?.length || 0}</p>
              <p className="text-sm text-gray-50">Comments</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-700 rounded-xl shadow-md p-4 border border-gray-200">
        <div className="flex space-x-6 border-b pb-2">
          {["questions", "answers", "comments"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`capitalize font-medium pb-2 ${
                activeTab === tab
                  ? "text-orange-600 border-b-2 border-orange-600"
                  : "text-gray-50 hover:text-orange-50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-4 space-y-3">
          {activeTab === "questions" &&
            (userQ.questionsData?.length ? (
              userQ.questionsData.map((q: any, i: number) => (
                <div
                  key={i}
                  className="p-4 bg-gray-100 rounded-lg border border-gray-200 hover:border-orange-400 shadow-sm hover:shadow-md transition"
                >
                  <h2 className="text-lg font-semibold text-gray-800">
                    {q.title || "Untitled Question"}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {q.description || "Question description..."}
                  </p>
                  <p className="text-sm text-orange-500">
                    Asked on {new Date(q.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-400">No questions yet.</p>
            ))}

          {activeTab === "answers" &&
            (userQ.answersData?.length ? (
              userQ.answersData.map((a: any, i: number) => (
                <div
                  key={i}
                  className="p-4 bg-gray-100 rounded-lg border border-gray-200 hover:border-orange-400 shadow-sm hover:shadow-md transition"
                >
                  <p className="text-gray-700">{a.text || "Answer content..."}</p>
                  <p className="text-sm text-gray-50">
                    Answered on {new Date(a.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-400">No answers yet.</p>
            ))}

          {activeTab === "comments" &&
            (userQ.commentsData?.length ? (
              userQ.commentsData.map((c: any, i: number) => (
                <div
                  key={i}
                  className="p-4 bg-gray-100 rounded-lg border border-gray-200 hover:border-orange-400 shadow-sm hover:shadow-md transition"
                >
                  <p className="text-gray-700">{c.text || "Comment content..."}</p>
                  <p className="text-sm text-gray-50">
                    Commented on {new Date(c.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-400">No comments yet.</p>
            ))}
        </div>
      </div>
    </div>
  );
}
