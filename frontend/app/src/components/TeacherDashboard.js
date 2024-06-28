import React, { useState, useEffect } from "react";
import { fetchData } from "../utils/api";
import ModuleForm from "./ModuleForm";
import TaskForm from "./TaskForm";
import { Box, Typography, Grid, Card, CardContent, Paper } from "@mui/material";
import { useSnackbar } from "notistack";

const cardStyle = {
  width: "100%",
  height: "100px",
  backgroundColor: "#e0e0e0",
  borderRadius: 2,
  cursor: "pointer",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const selectedCardStyle = {
  ...cardStyle,
  backgroundColor: "#ffcccc",
};

const columnStyle = {
  borderRight: "2px solid rgba(0,0,0,0.1)",
  paddingRight: "10px",
};

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
        const newModule =
          data.find((mod) => mod.id === selectedModule.id) || null;
        setSelectedModule(newModule);
      })
      .catch((error) => enqueueSnackbar(error.message, { variant: "error" }));
  };

  const handleTaskCreated = () => {
    fetchData(`/modules/${selectedModule.id}/tasks/`)
      .then((tasks) => {
        const updatedModule = { ...selectedModule, tasks: tasks };
        setSelectedModule(updatedModule);
        setSelectedTask(null);
        // Ensure the UI updates with the new task list
        fetchData("/modules/")
          .then((data) => {
            setModules(data);
            const updatedModule =
              data.find((mod) => mod.id === selectedModule.id) || null;
            setSelectedModule(updatedModule);
          })
          .catch((error) =>
            enqueueSnackbar(error.message, { variant: "error" })
          );
      })
      .catch((error) => enqueueSnackbar(error.message, { variant: "error" }));
  };

  return (
    <Grid container spacing={3} py={5} px={3}>
      <Grid item xs={12} md={3} sx={columnStyle}>
        <Typography variant="h5" gutterBottom>
          Modules
        </Typography>
        <Grid container spacing={3}>
          {modules.map((module) => (
            <Grid item xs={12} key={module.id}>
              <Card
                sx={
                  selectedModule && selectedModule.id === module.id
                    ? selectedCardStyle
                    : cardStyle
                }
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
              sx={
                selectedModule && !selectedModule.id
                  ? selectedCardStyle
                  : cardStyle
              }
              onClick={() => handleModuleSelect({})}
            >
              <CardContent>
                <Typography variant="h2" textAlign="center">
                  +
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>
      <Grid item xs={12} md={3} sx={columnStyle}>
        <Typography variant="h5" gutterBottom>
          Tasks
        </Typography>
        {selectedModule && (
          <Grid container spacing={3}>
            {selectedModule.tasks?.map((task, index) => (
              <Grid item xs={12} key={index}>
                <Card
                  sx={
                    selectedTask && selectedTask.id === task.id
                      ? selectedCardStyle
                      : cardStyle
                  }
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
                sx={
                  selectedTask && !selectedTask.id
                    ? selectedCardStyle
                    : cardStyle
                }
                onClick={() => handleTaskSelect({})}
              >
                <CardContent>
                  <Typography variant="h2" textAlign="center">
                    +
                  </Typography>
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
