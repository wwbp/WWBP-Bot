import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { postData } from "../utils/api";
import { Container, TextField, Button, Box, Typography } from "@mui/material";
import { useSnackbar } from "notistack";

function Login({ setLoggedIn, setRole }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await postData("/login/", { username, password });
      if (response.message === "Login successful") {
        localStorage.setItem("token", response.token);
        localStorage.setItem("role", response.role);
        setLoggedIn(true);
        setRole(response.role);
        navigate("/");
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
            error={!username}
            helperText={!username && "Username is required"}
          />
          <TextField
            fullWidth
            label="Password"
            margin="normal"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            error={!password}
            helperText={!password && "Password is required"}
          />
          <Button variant="contained" color="primary" type="submit">
            Login
          </Button>
        </form>
        <Box mt={2}>
          <Typography variant="body2">
            Don't have an account? <Link to="/signup">Sign Up</Link>
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}

export default Login;
