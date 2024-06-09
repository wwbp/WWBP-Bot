import React, { useState, useEffect } from "react";
import { postData, putData } from "../utils/api";
import TaskForm from "./TaskForm";
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Grid,
} from "@mui/material";
import { useSnackbar } from "notistack";

function ModuleForm({
  module,
  onModuleCreated,
  onClose,
  resetFormAfterSubmit,
}) {
  const initialModuleData = {
    name: "",
    start_time: "",
    end_time: "",
  };

  const [moduleData, setModuleData] = useState(initialModuleData);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (module.id) {
      setModuleData({
        name: module.name || "",
        start_time: module.start_time
          ? new Date(module.start_time).toISOString().slice(0, 16)
          : "",
        end_time: module.end_time
          ? new Date(module.end_time).toISOString().slice(0, 16)
          : "",
      });
      setTasks(module.tasks || []);
    } else {
      setModuleData(initialModuleData);
      setTasks([]);
    }
    setLoading(false);
  }, [module]);

  const handleModuleChange = (e) => {
    setModuleData({ ...moduleData, [e.target.name]: e.target.value });
  };

  const handleTaskChange = (index, updatedTask) => {
    const newTasks = tasks.map((task, i) => (i === index ? updatedTask : task));
    setTasks(newTasks);
  };

  const handleAddTask = () => {
    setTasks([
      ...tasks,
      {
        title: "",
        content: "",
        instruction_prompt: "",
        persona_prompt: "",
        time_allocated: "",
      },
    ]);
  };

  const handleRemoveTask = (index) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    if (!moduleData.name || !moduleData.start_time || !moduleData.end_time) {
      return false;
    }

    for (let task of tasks) {
      if (
        !task.title ||
        !task.content ||
        !task.instruction_prompt ||
        !task.persona_prompt ||
        !task.time_allocated
      ) {
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);

    if (!validateForm()) {
      enqueueSnackbar("Please fill all required fields", { variant: "error" });
      return;
    }

    try {
      if (module.id) {
        await putData(`/modules/${module.id}/`, {
          ...moduleData,
          tasks,
        });
        enqueueSnackbar("Module updated successfully!", { variant: "success" });
      } else {
        await postData("/modules/", {
          ...moduleData,
          tasks,
        });
        enqueueSnackbar("Module created successfully!", { variant: "success" });
        if (resetFormAfterSubmit) {
          setModuleData(initialModuleData);
          setTasks([]);
        }
      }
      onModuleCreated();
    } catch (error) {
      enqueueSnackbar(error.message, { variant: "error" });
      setError(error.message);
    }
  };

  if (loading) {
    return (
      <Box textAlign="center" py={5}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box py={5}>
      {error && <Typography color="error">Error: {error}</Typography>}
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Name"
              name="name"
              value={moduleData.name}
              onChange={handleModuleChange}
              margin="normal"
              required
              error={submitted && !moduleData.name}
              helperText={submitted && !moduleData.name && "Name is required"}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Start Time"
              name="start_time"
              type="datetime-local"
              value={moduleData.start_time}
              onChange={handleModuleChange}
              margin="normal"
              InputLabelProps={{
                shrink: true,
              }}
              required
              error={submitted && !moduleData.start_time}
              helperText={
                submitted && !moduleData.start_time && "Start Time is required"
              }
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="End Time"
              name="end_time"
              type="datetime-local"
              value={moduleData.end_time}
              onChange={handleModuleChange}
              margin="normal"
              InputLabelProps={{
                shrink: true,
              }}
              required
              error={submitted && !moduleData.end_time}
              helperText={
                submitted && !moduleData.end_time && "End Time is required"
              }
            />
          </Grid>
        </Grid>
        <Box my={2}>
          <Button variant="outlined" color="primary" onClick={handleAddTask}>
            Add Task
          </Button>
          <Grid container spacing={3}>
            {tasks.map((task, index) => (
              <Grid item xs={12} key={index}>
                <TaskForm
                  task={task}
                  onChange={(updatedTask) =>
                    handleTaskChange(index, updatedTask)
                  }
                  onRemove={() => handleRemoveTask(index)}
                  submitted={submitted}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
        <Button variant="contained" color="primary" type="submit">
          {module.id ? "Update Module" : "Create Module"}
        </Button>
        <Button variant="contained" color="secondary" onClick={onClose}>
          Cancel
        </Button>
      </form>
    </Box>
  );
}

export default ModuleForm;
