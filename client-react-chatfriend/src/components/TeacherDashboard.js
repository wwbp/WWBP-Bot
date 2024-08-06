import React, { useState, useEffect } from "react";
import { fetchData, deleteData, postData } from "../utils/api";
import ModuleForm from "./ModuleForm";
import TaskForm from "./TaskForm";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
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
  position: "relative",
};

const selectedCardStyle = {
  ...cardStyle,
  backgroundColor: "#E0B0FF",
};

const columnStyle = {
  borderRight: "2px solid rgba(0,0,0,0.1)",
  paddingRight: "10px",
};

function TeacherDashboard() {
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteType, setDeleteType] = useState(""); // 'module' or 'task'
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    fetchData("/modules/")
      .then((data) => setModules(data))
      .catch((error) => enqueueSnackbar(error.message, { variant: "error" }));
  }, []);

  const handleModuleSelect = async (module) => {
    if (module.id) {
      try {
        const tasks = await fetchData(`/modules/${module.id}/tasks/`);
        setSelectedModule({ ...module, tasks });
        setSelectedTask(null);
      } catch (error) {
        enqueueSnackbar(error.message, { variant: "error" });
      }
    } else {
      setSelectedModule({ id: null, name: "", tasks: [] });
      setSelectedTask(null);
    }
  };

  const handleTaskSelect = (task) => {
    setSelectedTask(task);
  };

  const handleModuleCreated = async () => {
    try {
      const data = await fetchData("/modules/");
      setModules(data);
      const newModule =
        data.find((mod) => mod.id === selectedModule.id) || null;
      setSelectedModule(newModule);
    } catch (error) {
      enqueueSnackbar(error.message, { variant: "error" });
    }
  };

  const handleTaskCreated = async () => {
    if (selectedModule && selectedModule.id) {
      try {
        const tasks = await fetchData(`/modules/${selectedModule.id}/tasks/`);
        const updatedModule = { ...selectedModule, tasks };
        setSelectedModule(updatedModule);
        setSelectedTask(null);
        const data = await fetchData("/modules/");
        setModules(data);
        const updatedModuleData =
          data.find((mod) => mod.id === selectedModule.id) || null;
        setSelectedModule(updatedModuleData);
      } catch (error) {
        enqueueSnackbar(error.message, { variant: "error" });
      }
    }
  };

  const handleDeleteClick = (item, type) => {
    setDeleteItem(item);
    setDeleteType(type);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      if (deleteType === "module") {
        await deleteData(`/modules/${deleteItem.id}/`);
        setModules(modules.filter((module) => module.id !== deleteItem.id));
        setSelectedModule(null);
      } else if (deleteType === "task") {
        await deleteData(`/tasks/${deleteItem.id}/`);
        const updatedTasks = selectedModule.tasks.filter(
          (task) => task.id !== deleteItem.id
        );
        setSelectedModule({ ...selectedModule, tasks: updatedTasks });
      }
      enqueueSnackbar(
        `${
          deleteType.charAt(0).toUpperCase() + deleteType.slice(1)
        } deleted successfully!`,
        { variant: "success" }
      );
    } catch (error) {
      enqueueSnackbar(error.message, { variant: "error" });
    } finally {
      setDeleteDialogOpen(false);
      setDeleteItem(null);
      setDeleteType("");
    }
  };

  const handleDuplicateModule = async () => {
    if (selectedModule && selectedModule.id) {
      try {
        const duplicatedModule = await postData(
          `/modules/${selectedModule.id}/duplicate/`
        );
        setModules([...modules, duplicatedModule]);
        enqueueSnackbar("Module duplicated successfully!", {
          variant: "success",
        });
      } catch (error) {
        enqueueSnackbar(error.message, { variant: "error" });
      }
    }
  };

  const handleDuplicateTask = async (task) => {
    try {
      const duplicatedTask = await postData(`/tasks/${task.id}/duplicate/`);
      const tasks = await fetchData(`/modules/${task.module}/tasks/`);
      setSelectedModule({ ...selectedModule, tasks });
      enqueueSnackbar("Task duplicated successfully!", { variant: "success" });
    } catch (error) {
      enqueueSnackbar(error.message, { variant: "error" });
    }
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

                <Box sx={{ position: "absolute", bottom: 4, right: 4, display: "flex" }}>
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(module, "module");
                  }}
                >
                  <DeleteIcon />
                </IconButton>
                <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateModule(module, "module");
                    }}
                  >
                    <ContentCopyIcon />
                  </IconButton>
                </Box>

              </Card>
            </Grid>
          ))}
          <Grid item xs={12}>
            <Card
              sx={
                selectedModule && selectedModule.id === null
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
                  
                  <Box sx={{ position: "absolute", bottom: 4, right: 4, display: "flex" }}>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(task, "task");
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateTask(task, "task");
                    }}
                  >
                    <ContentCopyIcon />
                  </IconButton>
                </Box>

                </Card>
              </Grid>
            ))}
            <Grid item xs={12}>
              <Card
                sx={
                  selectedTask && selectedTask.id === null
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
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this {deleteType}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
            No
          </Button>
          <Button onClick={handleDeleteConfirm} color="primary" autoFocus>
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}

export default TeacherDashboard;
