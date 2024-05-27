import React, { useState, useEffect } from "react";
import { fetchData, putData } from "../utils/api";
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
} from "@mui/material";

function UserProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData("/profile/")
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("There was an error fetching the user data!", error);
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
        alert("Profile updated successfully!");
      })
      .catch((error) => {
        console.error("There was an error updating the profile!", error);
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
        />
        <TextField
          fullWidth
          label="Email"
          name="email"
          value={user.email}
          onChange={handleChange}
          margin="normal"
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
        <Button variant="contained" color="primary" type="submit">
          Update Profile
        </Button>
      </form>
    </Box>
  );
}

export default UserProfile;
