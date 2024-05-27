import React, { useState, useEffect } from "react";
import { fetchData, postData, putData } from "../utils/api";
import TaskForm from "./TaskForm";
import {
  Box,
  TextField,
  Button,
  Typography,
  MenuItem,
  CircularProgress,
} from "@mui/material";

function ModuleForm({ module, onModuleCreated, onClose }) {
  const [moduleData, setModuleData] = useState({
    name: module.name || "",
    description: module.description || "",
    start_time: module.start_time || "",
    end_time: module.end_time || "",
    assigned_students: module.assigned_students || [],
  });
  const [tasks, setTasks] = useState(module.tasks || []);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData("/users/")
      .then((data) => {
        const studentUsers = data.filter((user) => user.role === "student");
        setStudents(studentUsers);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, []);

  const handleModuleChange = (e) => {
    setModuleData({ ...moduleData, [e.target.name]: e.target.value });
  };

  const handleStudentChange = (e) => {
    const selectedOptions = Array.from(
      e.target.selectedOptions,
      (option) => option.value
    );
    setModuleData({ ...moduleData, assigned_students: selectedOptions });
  };

  const handleTaskChange = (index, updatedTask) => {
    const newTasks = tasks.map((task, i) => (i === index ? updatedTask : task));
    setTasks(newTasks);
  };

  const handleAddTask = () => {
    setTasks([...tasks, { title: "", content: "" }]);
  };

  const handleRemoveTask = (index) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (module.id) {
        await putData(`/modules/${module.id}/`, {
          ...moduleData,
          tasks,
        });
      } else {
        await postData("/modules/", {
          ...moduleData,
          tasks,
        });
      }
      onModuleCreated();
      onClose();
    } catch (error) {
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
      <Typography variant="h4" gutterBottom>
        {module.id ? "Edit Module" : "Create Module"}
      </Typography>
      {error && <Typography color="error">Error: {error}</Typography>}
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Name"
          name="name"
          value={moduleData.name}
          onChange={handleModuleChange}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Description"
          name="description"
          value={moduleData.description}
          onChange={handleModuleChange}
          margin="normal"
          multiline
          rows={4}
        />
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
        />
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
        />
        <TextField
          fullWidth
          select
          label="Assign to Students"
          name="assigned_students"
          value={moduleData.assigned_students}
          onChange={handleStudentChange}
          SelectProps={{
            multiple: true,
          }}
          margin="normal"
        >
          {students.map((student) => (
            <MenuItem key={student.id} value={student.id}>
              {student.username}
            </MenuItem>
          ))}
        </TextField>
        <Box my={2}>
          <Typography variant="h6">Tasks</Typography>
          {tasks.map((task, index) => (
            <Box key={index} mb={2}>
              <TaskForm
                task={task}
                onChange={(updatedTask) => handleTaskChange(index, updatedTask)}
              />
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => handleRemoveTask(index)}
              >
                Remove Task
              </Button>
            </Box>
          ))}
          <Button variant="outlined" color="primary" onClick={handleAddTask}>
            Add Task
          </Button>
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
