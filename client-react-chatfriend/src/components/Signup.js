import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { postData } from "../utils/api";
import {
  Container,
  TextField,
  Button,
  Box,
  Typography,
  MenuItem,
  Slider,
} from "@mui/material";
import { useSnackbar } from "notistack";

function Signup({ setLoggedIn, setRole }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRoleState] = useState("student");
  const [voice_speed, setVoiceSpeed] = useState(1.0);
  const [submitted, setSubmitted] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);

    if (!username || !email || !password || !role) {
      return;
    }

    try {
      const response = await postData("/register/", {
        username,
        email,
        password,
        role,
        voice_speed,
      });
      if (response.message === "User created successfully") {
        localStorage.setItem("token", response.token);
        localStorage.setItem("role", role);
        setLoggedIn(true);
        setRole(role);
        if (from === "/") {
          navigate(
            role === "teacher" ? "/teacher-dashboard" : "/student-dashboard"
          );
        } else {
          navigate(from, { replace: true });
        }
        enqueueSnackbar("User created successfully!", { variant: "success" });
      } else {
        throw new Error(response.message || "Failed to register!");
      }
    } catch (error) {
      enqueueSnackbar(error.message, { variant: "error" });
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
            required
            error={submitted && !username}
            helperText={submitted && !username && "Username is required"}
          />
          <TextField
            fullWidth
            label="Email"
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            error={submitted && !email}
            helperText={submitted && !email && "Email is required"}
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
            <Typography gutterBottom>
              Voice Speed
            </Typography>
            <Slider
              fullWidth
              // name="voice_speed"
              label="Voice Speed"
              margin="normal"
              value={voice_speed}
              onChange={
                (e)=>setVoiceSpeed(e.target.value)
              }
              valueLabelDisplay="auto"
              step={0.5}
              min={0.5}
              max={2.0}
            />
          <TextField
            select
            fullWidth
            label="Role"
            margin="normal"
            value={role}
            onChange={(e) => setRoleState(e.target.value)}
            required
            error={submitted && !role}
            helperText={submitted && !role && "Role is required"}
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
