import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { postData } from "../utils/api";

function Login({ setLoggedIn }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    const apiUrl = process.env.REACT_APP_API_URL;
    try {
      const response = await postData(`${apiUrl}/login/`, {
        username,
        password,
      });

      if (response.ok && response.message === "Login successful") {
        setLoggedIn(true);
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
