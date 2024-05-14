import React, { useState, useEffect } from "react";
import { fetchData, postData, putData } from "../utils/api"; // Import putData

function UserProfile() {
  const [user, setUser] = useState({
    username: "",
    email: "",
    role: "",
    grade: "",
    preferred_language: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData("/profile/")
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch((error) => {
        setError("Error loading user data");
        setLoading(false);
      });
  }, []);

  const handleChange = (e) => {
    setUser({
      ...user,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    putData("/profile/", user) // Use putData instead of postData
      .then(() => {
        alert("Profile updated successfully!");
      })
      .catch((error) => {
        console.error("There was an error updating the profile!", error);
      });
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div>
      <h1>User Profile</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Username:</label>
          <input
            type="text"
            name="username"
            value={user.username}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Email:</label>
          <input
            type="email"
            name="email"
            value={user.email}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Role:</label>
          <input type="text" name="role" value={user.role} disabled />
        </div>
        {user.role === "student" && (
          <>
            <div>
              <label>Grade:</label>
              <input
                type="text"
                name="grade"
                value={user.grade}
                onChange={handleChange}
              />
            </div>
            <div>
              <label>Preferred Language:</label>
              <input
                type="text"
                name="preferred_language"
                value={user.preferred_language}
                onChange={handleChange}
              />
            </div>
          </>
        )}
        <button type="submit">Update Profile</button>
      </form>
    </div>
  );
}

export default UserProfile;
