import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { postData } from "../utils/api";
import {
  Container,
  TextField,
  Button,
  Box,
  Typography,
  MenuItem,
} from "@mui/material";

function Signup({ setLoggedIn, setRole }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRoleState] = useState("student");
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await postData("/register/", {
        username,
        email,
        password,
        role,
      });
      if (response.message === "User created successfully") {
        localStorage.setItem("token", response.token);
        localStorage.setItem("role", role);
        setLoggedIn(true);
        setRole(role);
        navigate("/");
      } else {
        throw new Error(response.message || "Failed to register!");
      }
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box py={5}>
        <Typography variant="h4" gutterBottom>
          Sign Up
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Username"
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            fullWidth
            label="Email"
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            fullWidth
            label="Password"
            margin="normal"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <TextField
            select
            fullWidth
            label="Role"
            margin="normal"
            value={role}
            onChange={(e) => setRoleState(e.target.value)}
          >
            <MenuItem value="student">Student</MenuItem>
            <MenuItem value="teacher">Teacher</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
          </TextField>
          <Button variant="contained" color="primary" type="submit">
            Sign Up
          </Button>
        </form>
      </Box>
    </Container>
  );
}

export default Signup;
