import React, { useState, useEffect } from "react";
import { fetchData } from "../utils/api";
import { Link } from "react-router-dom";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from "@mui/material";

function StudentDashboard() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData("/modules/assigned/")
      .then((data) => {
        setModules(data);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Box textAlign="center" py={5}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" py={5}>
        <Typography color="error">Error: {error}</Typography>
      </Box>
    );
  }

  return (
    <Box py={5}>
      <Typography variant="h4" gutterBottom>
        Student Dashboard
      </Typography>
      <Typography variant="h5" gutterBottom>
        Active Modules
      </Typography>
      {modules.length === 0 ? (
        <Typography>No active modules assigned to you</Typography>
      ) : (
        <List>
          {modules.map((module) => (
            <ListItem
              button
              component={Link}
              to={`/modules/${module.id}`}
              key={module.id}
            >
              <ListItemText primary={module.name} />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}

export default StudentDashboard;
