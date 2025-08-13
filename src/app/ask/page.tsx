"use client"
import React, { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";

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
  }) => void;
}

export default function AskQuestionPage({ availableTags, onSubmit }: AskQuestionProps) {
  const { logout } = useAuth0();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

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

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit({ title, description, tags: selectedTags, images });
    }
    setTitle("");
    setDescription("");
    setSelectedTags([]);
    setImages([]);
    setPreviews([]);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white shadow-md rounded-lg space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Ask a Question</h1>
        <button
          onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
          className="text-sm text-red-500 hover:text-red-600"
        >
          Logout
        </button>
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
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Attach Images</label>
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50"
        >
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            id="image-input"
            onChange={(e) => handleImageChange(e.target.files)}
          />
          <label htmlFor="image-input" className="cursor-pointer text-gray-500">
            📷 Drag & drop images here or click to upload
          </label>
        </div>

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
      </div>

      {/* Submit Button */}
      <div className="text-right">
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || !description.trim()}
          className="bg-orange-500 text-white px-6 py-2 rounded-md hover:bg-orange-600 disabled:opacity-50"
        >
          Post Question
        </button>
      </div>
    </div>
  );
}
