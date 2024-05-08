"use client";

import { useState, useEffect } from "react";

const HomePage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const fetchAuthStatus = async () => {
      const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/users/auth/`;
      console.log("Backend URL:", backendUrl);

      try {
        const res = await fetch(backendUrl, { credentials: "include" });
        const data = await res.json(); // Assuming JSON response
        console.log("Response data:", data);
        setIsLoggedIn(res.status === 200);
      } catch (error) {
        console.error("Authentication error:", error);
      } finally {
        setIsLoading(false);
        console.log("Finished loading authentication status");
      }
    };

    fetchAuthStatus();
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  console.log("isLoggedIn:", isLoggedIn);

  return (
    <div>
      <h1>Welcome to Your App</h1>
      <button onClick={() => console.log("GritCoach Selected")}>
        GritCoach
      </button>
      <button onClick={() => console.log("ChatFriend Selected")}>
        ChatFriend
      </button>
    </div>
  );
};

export default HomePage;
