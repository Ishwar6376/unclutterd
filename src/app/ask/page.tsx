"use client";
import React, { useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import {useUserStore} from "@/store/userStore"
interface Tag {
  id: string;
  name: string;
}

interface AskQuestionProps {
  availableTags: Tag[];
  onSubmit?: (data: {
    title: string;
    description: string;
    tags: string[];
    images: File[];        
    uploadedUrls: string[]; 
  }) => void;
}

export default function AskQuestionPage({ availableTags, onSubmit }: AskQuestionProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]); 
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]); 
  const [loading, setLoading] = useState(false);
  const User=useUserStore().user;
  const handleTagToggle = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleImageChange = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    setImages((prev) => [...prev, ...newFiles]);
    setPreviews((prev) => [...prev, ...newFiles.map((f) => URL.createObjectURL(f))]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleImageChange(e.dataTransfer.files);
  };

  const handleUpload = async () => {
    setLoading(true);
    const newUploadedUrls: string[] = [];

    for (const img of images) {
      const formData = new FormData();
      formData.append("file", img);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.url) {
        newUploadedUrls.push(data.url); 
      }
    }

    setUploadedUrls(newUploadedUrls); 
    setLoading(false);
    toast.success(`Uploaded ${newUploadedUrls.length} image(s)`);
  };

  const handleSubmit = async () => {
    try {
      const res=await axios.post("/api/ask",{
        title,
        description,
        images:uploadedUrls,
        author:User,
      })
      if (res.status===201){
        toast.success("Qusetion posted successfully");
        setTitle("");
        setDescription("");
        setSelectedTags([]);
        setImages([]);
        setPreviews([]);
        setUploadedUrls([]);

      }
    } catch (error) {
      toast.error("Failed to post question")
    }
  };

  return (
    <div
      className="max-w-3xl mx-auto p-6 bg-gray-900 shadow-md rounded-lg space-y-6"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Ask a Question</h1>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter a short, clear question title"
          className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your question in detail..."
          rows={5}
          className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
        <div className="flex flex-wrap gap-2">
        </div>
      </div>

      {/* Image Upload */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">Attach Images</label>
        <input
          type="file"
          multiple
          onChange={(e) => handleImageChange(e.target.files)}
          className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-orange-500 file:text-white hover:file:bg-orange-600"
        />
        <button
          onClick={handleUpload}
          className="bg-orange-500 text-white px-4 py-2 rounded mt-2"
        >
          {loading ? "Uploading..." : "Upload All"}
        </button>
        {previews.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-3">
            {previews.map((src, idx) => (
              <img
                key={idx}
                src={src}
                alt={`preview-${idx}`}
                className="w-full h-24 object-cover rounded-md border"
              />
            ))}
          </div>
        )}

        {uploadedUrls.length > 0 && (
          <div className="mt-4">
            <p className="text-gray-300">Uploaded Images:</p>
            <div className="grid grid-cols-3 gap-3 mt-2">
              {uploadedUrls.map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt={`uploaded-${idx}`}
                  className="w-full h-24 object-cover rounded-md border"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="text-right">
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || !description.trim() || loading} // disable while loading
          className={`bg-orange-500 text-white px-6 py-2 rounded-md 
           hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition`}
          >
          {loading ? "Posting..." : "Post Question"}
        </button>

      </div>
    </div>
  );
}
