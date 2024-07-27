import React from "react";
import { Box, Typography, Button } from "@mui/material";
import CurrentTime from "./CurrentTime";
import { Link } from "react-router-dom";

function HomePage({ isLoggedIn }) {
  return (
    <Box textAlign="center" py={5}>
      <Typography variant="h2" gutterBottom>
        Welcome to the Home
      </Typography>
      {isLoggedIn ? (
        <CurrentTime />
      ) : (
        <Typography variant="h6">You are not logged in</Typography>
      )}
      {!isLoggedIn && (
        <Button
          variant="contained"
          color="primary"
          component={Link}
          to="/login"
        >
          Login
        </Button>
      )}
    </Box>
  );
}

export default HomePage;
