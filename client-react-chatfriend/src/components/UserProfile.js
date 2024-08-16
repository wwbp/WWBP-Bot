import React, { useState, useEffect } from "react";
import { fetchData, putData } from "../utils/api";
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Container,
  Slider,
} from "@mui/material";
import InteractionMode from './InteractionMode';
import { useSnackbar } from "notistack";

function UserProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    fetchData("/profile/")
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch((error) => {
        enqueueSnackbar("Error fetching user data!", { variant: "error" });
        setLoading(false);
      });
  }, []);

  const handleChange = (e) => {
    setUser({
      ...user,
      [e.target.name]: e.target.value,
    });
  };

  // const handlePrefNameChange = (e,value) => {
  //   setUser({
  //     ...user,
  //     preferred_name: value,
  //   });
  // };

  const handleSliderChange = (e, value) =>{
    setUser({
      ...user,
      voice_speed: value,
    });
  }
  
  const handleModeChange = (mode) => {
    setUser({
      ...user,
      interaction_mode: mode,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);

    if (!user.username || !user.email) {
      return;
    }

    putData("/profile/", user)
      .then(() => {
        enqueueSnackbar("Profile updated successfully!", {
          variant: "success",
        });
      })
      .catch((error) => {
        const message =
          error.response?.data?.detail || "Error updating profile!";
        enqueueSnackbar(message, { variant: "error" });
      });
  };

  if (loading) {
    return (
      <Box textAlign="center" py={5}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box textAlign="center" py={5}>
        <Typography color="error">Error loading user data</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 5 }}>
      <Typography variant="h4" gutterBottom>
        User Profile
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Username"
          name="username"
          value={user.username}
          onChange={handleChange}
          margin="normal"
          required
          error={submitted && !user.username}
          helperText={submitted && !user.username && "Username is required"}
        />
        <TextField
          fullWidth
          label="Preferred Name"
          name="preferred_name"
          value={user.preferred_name}
          onChange={handleChange}
          margin="normal"
        />        
        <TextField
          fullWidth
          label="Email"
          name="email"
          value={user.email}
          onChange={handleChange}
          margin="normal"
          required
          error={submitted && !user.email}
          helperText={submitted && !user.email && "Email is required"}
        />
        <Typography gutterBottom>Voice Speed</Typography>
        <Slider
          name="voice_speed"
          label="Voice Speed"
          value={user.voice_speed || 1.0}
          onChange={handleSliderChange}
          valueLabelDisplay="auto"
          step={0.5}
          min={0.5}
          max={2.0}
        />


        <TextField
          fullWidth
          label="Role"
          name="role"
          value={user.role}
          disabled
          margin="normal"
        />
        {user.role === "student" && (
          <>
            <TextField
              fullWidth
              label="Grade"
              name="grade"
              value={user.grade}
              onChange={handleChange}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Preferred Language"
              name="preferred_language"
              value={user.preferred_language}
              onChange={handleChange}
              margin="normal"
            />
          </>
        )}
      <InteractionMode selectedMode={user.interaction_mode} handleModeChange={handleModeChange} />

        <Box mt={3} display="flex" justifyContent="flex-end">
          <Button variant="contained" color="primary" type="submit">
            Update Profile
          </Button>
        </Box>
      </form>
    </Container>
  );
}

export default UserProfile;
