"use client";

import {useUserStore}  from "@/store/userStore";

export default function Profile() {
  const user = useUserStore((state) => state.user);
  if (!user) return <p>Loading...</p>;
  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
