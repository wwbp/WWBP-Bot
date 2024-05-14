import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { postData } from "../utils/api";

function Signup({ setLoggedIn }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student"); // Default role is student
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    const apiUrl = process.env.REACT_APP_API_URL;
    try {
      const response = await postData(`${apiUrl}/register/`, {
        username,
        email,
        password,
        role, // Include role in the registration data
      });
      if (response.ok && response.message === "User created successfully") {
        localStorage.setItem("token", response.token);
        setLoggedIn(true);
        navigate("/");
      } else {
        throw new Error(response.message || "Failed to register!");
      }
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Username:
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </label>
      <label>
        Email:
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label>
        Password:
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <label>
        Role:
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <button type="submit">Sign Up</button>
    </form>
  );
}

export default Signup;
