import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { postData } from "../utils/api";
import { Container, TextField, Button, Box, Typography } from "@mui/material";
import { useSnackbar } from "notistack";

function Login({ setLoggedIn, setRole }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    if (storedRole === "student") {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
    }
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);

    if (!username || !password) {
      return;
    }

    try {
      const response = await postData("/login/", { username, password });
      if (response.message === "Login successful") {
        localStorage.setItem("token", response.token);
        localStorage.setItem("role", response.role);
        setLoggedIn(true);
        setRole(response.role);

        // Determine the dashboard based on the user's role
        let dashboardPath;
        switch (response.role) {
          case "teacher":
            dashboardPath = "/teacher-dashboard";
            break;
          default:
            dashboardPath = "/student-dashboard";
            break;
        }

        // Redirect to the dashboard or the intended page
        navigate(from === "/" || from === "/login" ? dashboardPath : from, {
          replace: true,
        });
        enqueueSnackbar("Login successful!", { variant: "success" });
      } else {
        throw new Error(response.message || "Failed to login!");
      }
    } catch (error) {
      enqueueSnackbar(error.message, { variant: "error" });
    }
  };

  return (
    <Container maxWidth="sm">
      <Box py={5}>
        <Typography variant="h4" gutterBottom>
          Login
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Username"
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            error={submitted && !username}
            helperText={submitted && !username && "Username is required"}
          />
          <TextField
            fullWidth
            label="Password"
            margin="normal"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            error={submitted && !password}
            helperText={submitted && !password && "Password is required"}
          />
          <Button variant="contained" color="primary" type="submit">
            Login
          </Button>
        </form>
        <Box mt={2}>
          <Typography variant="body2">
            Don't have an account?{" "}
            <Link to="/signup" state={{ from }}>
              Sign Up
            </Link>
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}

export default Login;
