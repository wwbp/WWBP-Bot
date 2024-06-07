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

function StudentDashboard() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

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

  function handleTaskSelection(event, selectedTask, selectedModule){
    setSelectedModule(selectedModule);
    setSelectedTask(selectedTask);
  }

  function moduleCard(module) {
    return (
      <Card key={module.id}>
        <CardContent>
          <Typography variant="h5" gutterBottom>{module.name}</Typography>
          <Typography variant="subtitle1">{module.description}</Typography>
          <Divider />
          <List dense>
            {module.tasks.map((task) => (
              <Paper 
                elevation={0} 
                spacing={5} 
                sx={{ ':hover': { backgroundColor: '#b8b6b6' } }} 
                onClick={(event) => handleTaskSelection(event, task, module)}
                key={`${module.id}-${task.id}`}
              >
                <ListItem key={task.id}>
                  <ListItemText primary={task.title} secondary={task.content} />
                </ListItem>
                <Divider/>
              </Paper>
            ))}
          </List>
        </CardContent>
      </Card>
    )
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
    <Stack
      direction="row"
      justifyContent="flex-start"
      alignItems="stretch"
      spacing={2}
      sx={{ height: '100vh' }}
    >
      <Box py={5} sx={{ backgroundColor: '#333333', color: 'white', overflow: 'scroll'}} p={5}>
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
      </Box>
      <Box p={5}>
        {(selectedModule && selectedTask) ? (
          <ModuleInteraction moduleId={selectedModule.id} selectedTask={selectedTask} />
        ): (
          <Typography variant="h5">Please select a specific task from the list on the left!</Typography>
        )}
      </Box>
    </Stack>
  );
}

export default StudentDashboard;
