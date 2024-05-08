import axios from "axios";
import { useRouter } from "next/router";
import { useState } from "react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/users/login/`; // Correctly configured endpoint
    try {
      const response = await axios.post(
        backendUrl,
        { email, password }, // Use email and password for login
        { withCredentials: true }
      );
      if (response.status === 200) {
        router.push("/homepage"); // Redirect to homepage after login
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <form onSubmit={handleLogin}>
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
      <button type="submit">Login</button>
    </form>
  );
};

export default Login;
