import React, { useState, useEffect } from "react";
import { fetchData } from "../utils/api";
import { useParams } from "react-router-dom";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Paper,
} from "@mui/material";
import ModuleInteraction from "./ModuleInteraction";
import { useSnackbar } from "notistack";
import Grid from "@mui/material/Grid";

function ModuleTasks() {
  const { moduleId } = useParams();
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    fetchData(`/modules/${moduleId}/tasks/`)
      .then((taskData) => {
        setTasks(taskData);
        setLoading(false);
      })
      .catch((error) => {
        enqueueSnackbar(error.message, { variant: "error" });
        setLoading(false);
      });
  }, [moduleId]);

  function handleTaskSelection(task) {
    setSelectedTask(task);
  }

  if (loading) {
    return (
      <Box textAlign="center" py={5}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Grid container sx={{ height: "100vh" }}>
      <Grid
        item
        xs={12}
        md={3}
        sx={{
          backgroundColor: "white",
          color: "black",
          overflowY: "auto",
          borderRight: "1px solid #e0e0e0",
          height: "100%",
        }}
      >
        {tasks.length === 0 ? (
          <Typography>No tasks available</Typography>
        ) : (
          <List dense sx={{ p: 2 }}>
            {tasks.map((task) => (
              <Paper
                elevation={3}
                sx={{
                  ":hover": { backgroundColor: "#e0e0e0", cursor: "pointer" },
                  marginBottom: 1,
                  padding: 1,
                  borderRadius: 2,
                }}
                onClick={() => handleTaskSelection(task)}
                key={task.id}
              >
                <ListItem key={task.id}>
                  <ListItemText primary={task.title} />
                </ListItem>
              </Paper>
            ))}
          </List>
        )}
      </Grid>
      <Grid item xs={12} md={9} sx={{ height: "100%" }}>
        {selectedTask ? (
          <ModuleInteraction moduleId={moduleId} selectedTask={selectedTask} />
        ) : (
          <Box
            p={2}
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <Typography variant="h5">
              Please select a specific task from the list on the left!
            </Typography>
          </Box>
        )}
      </Grid>
    </Grid>
  );
}

export default ModuleTasks;
