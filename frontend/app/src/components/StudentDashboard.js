import React, { useState, useEffect } from "react";
import { fetchData } from "../utils/api";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Stack,
  Card,
  CardContent,
  Divider,
  Paper,
} from "@mui/material";
import ModuleInteraction from "./ModuleInteraction";
import Grid from "@mui/material/Unstable_Grid2";
import { useSnackbar } from "notistack";

function StudentDashboard() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    fetchData("/modules/assigned/")
      .then((data) => {
        setModules(data);
        setLoading(false);
      })
      .catch((error) => {
        enqueueSnackbar(error.message, { variant: "error" });
        setLoading(false);
      });
  }, []);

  function handleTaskSelection(event, selectedTask, selectedModule) {
    setSelectedModule(selectedModule);
    setSelectedTask(selectedTask);
  }

  function moduleCard(module) {
    return (
      <Card
        key={module.id}
        sx={{ borderRadius: 2, backgroundColor: "#ffcccc", color: "white" }}
      >
        <CardContent>
          <Typography variant="h5" gutterBottom>
            {module.name}
          </Typography>
          <Typography variant="subtitle1" sx={{ marginBottom: 2 }}>
            {module.description}
          </Typography>
          <Divider sx={{ marginBottom: 2 }} />
          <List dense>
            {module.tasks.map((task) => (
              <Paper
                elevation={3}
                sx={{
                  ":hover": { backgroundColor: "#e0e0e0", cursor: "pointer" },
                  marginBottom: 1,
                  padding: 1,
                  borderRadius: 2,
                }}
                onClick={(event) => handleTaskSelection(event, task, module)}
                key={`${module.id}-${task.id}`}
              >
                <ListItem key={task.id}>
                  <ListItemText primary={task.title} />
                </ListItem>
              </Paper>
            ))}
          </List>
        </CardContent>
      </Card>
    );
  }

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
    <Box sx={{ flexGrow: 1 }}>
      <Grid container spacing={2}>
        <Grid
          xs={12}
          md={4}
          sx={{
            backgroundColor: "white",
            color: "black",
            overflow: "scroll",
            height: "100vh",
            padding: 2,
          }}
        >
          <Typography variant="h5" gutterBottom>
            Active Modules
          </Typography>
          {modules.length === 0 ? (
            <Typography>No active modules assigned to you</Typography>
          ) : (
            <Stack spacing={2}>
              {modules.map((module) => moduleCard(module))}
            </Stack>
          )}
        </Grid>
        <Grid xs>
          <Box p={5} sx={{ height: "100vh" }}>
            {selectedModule && selectedTask ? (
              <ModuleInteraction
                moduleId={selectedModule.id}
                selectedTask={selectedTask}
              />
            ) : (
              <Typography variant="h5">
                Please select a specific task from the list on the left!
              </Typography>
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

export default StudentDashboard;
