import React, { useState, useEffect } from "react";
import { fetchData, putData } from "../utils/api";
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
} from "@mui/material";
import { useSnackbar } from "notistack";

function UserProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
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

  const handleSubmit = (e) => {
    e.preventDefault();
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
    <Box py={5}>
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
          error={!user.username}
          helperText={!user.username && "Username is required"}
        />
        <TextField
          fullWidth
          label="Email"
          name="email"
          value={user.email}
          onChange={handleChange}
          margin="normal"
          required
          error={!user.email}
          helperText={!user.email && "Email is required"}
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
              required
              error={!user.grade}
              helperText={!user.grade && "Grade is required"}
            />
            <TextField
              fullWidth
              label="Preferred Language"
              name="preferred_language"
              value={user.preferred_language}
              onChange={handleChange}
              margin="normal"
              required
              error={!user.preferred_language}
              helperText={
                !user.preferred_language && "Preferred language is required"
              }
            />
          </>
        )}
        <Button variant="contained" color="primary" type="submit">
          Update Profile
        </Button>
      </form>
    </Box>
  );
}

export default UserProfile;
