import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { postData } from "../utils/api";

function Login({ setLoggedIn, setRole }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await postData("/login/", {
        username,
        password,
      });
      if (response.message === "Login successful") {
        localStorage.setItem("token", response.token);
        localStorage.setItem("role", response.role);
        setLoggedIn(true);
        setRole(response.role);
        navigate("/");
      } else {
        throw new Error(response.message || "Failed to login!");
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
        Password:
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button type="submit">Login</button>
    </form>
  );
}

export default Login;
