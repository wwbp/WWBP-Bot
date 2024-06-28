import React, { useState, useEffect } from "react";
import { fetchData } from "../utils/api";
import ModuleForm from "./ModuleForm";
import TaskForm from "./TaskForm";
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CircularProgress,
} from "@mui/material";
import { useSnackbar } from "notistack";

function TeacherDashboard() {
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    fetchData("/modules/")
      .then((data) => setModules(data))
      .catch((error) => enqueueSnackbar(error.message, { variant: "error" }));
  }, []);

  const handleModuleSelect = (module) => {
    setSelectedModule(module);
    setSelectedTask(null);
  };

  const handleTaskSelect = (task) => {
    setSelectedTask(task);
  };

  const handleModuleCreated = () => {
    fetchData("/modules/")
      .then((data) => {
        setModules(data);
        const updatedModule =
          data.find((mod) => mod.id === selectedModule.id) || null;
        setSelectedModule(updatedModule);
      })
      .catch((error) => enqueueSnackbar(error.message, { variant: "error" }));
  };

  const handleTaskCreated = () => {
    fetchData(`/modules/${selectedModule.id}/tasks/`)
      .then((tasks) => {
        const updatedModule = { ...selectedModule, tasks: tasks };
        setSelectedModule(updatedModule);
      })
      .catch((error) => enqueueSnackbar(error.message, { variant: "error" }));
  };

  return (
    <Grid container spacing={3} py={5} px={3}>
      <Grid item xs={12} md={3}>
        <Typography variant="h5" gutterBottom>
          Modules
        </Typography>
        <Grid container spacing={3}>
          {modules.map((module) => (
            <Grid item xs={12} key={module.id}>
              <Card
                sx={{
                  backgroundColor:
                    selectedModule && selectedModule.id === module.id
                      ? "#ffcccc"
                      : "#e0e0e0",
                  borderRadius: 2,
                  cursor: "pointer",
                }}
                onClick={() => handleModuleSelect(module)}
              >
                <CardContent>
                  <Typography variant="h6">{module.name}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
          <Grid item xs={12}>
            <Card
              sx={{
                backgroundColor: "#e0e0e0",
                borderRadius: 2,
                border: "2px dashed #9e9e9e",
                cursor: "pointer",
              }}
              onClick={() => handleModuleSelect({})}
            >
              <CardContent>
                <Typography variant="h6">+ Create New Module</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>
      <Grid item xs={12} md={3}>
        <Typography variant="h5" gutterBottom>
          Tasks
        </Typography>
        {selectedModule && (
          <Grid container spacing={3}>
            {selectedModule.tasks?.map((task, index) => (
              <Grid item xs={12} key={index}>
                <Card
                  sx={{
                    backgroundColor:
                      selectedTask && selectedTask.title === task.title
                        ? "#ffcccc"
                        : "#e0e0e0",
                    borderRadius: 2,
                    cursor: "pointer",
                  }}
                  onClick={() => handleTaskSelect(task)}
                >
                  <CardContent>
                    <Typography variant="h6">{task.title}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            <Grid item xs={12}>
              <Card
                sx={{
                  backgroundColor: "#e0e0e0",
                  borderRadius: 2,
                  border: "2px dashed #9e9e9e",
                  cursor: "pointer",
                }}
                onClick={() => handleTaskSelect({})}
              >
                <CardContent>
                  <Typography variant="h6">+ Add Task</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Grid>
      <Grid item xs={12} md={6}>
        {selectedModule && !selectedTask && (
          <ModuleForm
            module={selectedModule}
            onModuleCreated={handleModuleCreated}
          />
        )}
        {selectedModule && selectedTask && (
          <TaskForm
            task={selectedTask}
            moduleId={selectedModule.id}
            onTaskCreated={handleTaskCreated}
          />
        )}
      </Grid>
    </Grid>
  );
}

export default TeacherDashboard;
