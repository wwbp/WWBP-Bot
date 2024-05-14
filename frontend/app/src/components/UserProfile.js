import React, { useState, useEffect } from "react";
import { fetchData, putData } from "../utils/api";

function UserProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData("/profile/")
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("There was an error fetching the user data!", error);
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
    putData("/profile/", user)
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

  if (!user) {
    return <div>Error loading user data</div>;
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
