import React, { useState, useEffect } from "react";
import { fetchData, postData, putData } from "../utils/api";
import TaskForm from "./TaskForm";
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardActions,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";

function ModuleForm({
  module,
  onModuleCreated,
  onClose,
  resetFormAfterSubmit,
}) {
  const initialModuleData = {
    name: "",
    description: "",
    start_time: "",
    end_time: "",
    assigned_students: [],
  };

  const [moduleData, setModuleData] = useState(initialModuleData);
  const [tasks, setTasks] = useState([]);
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

  useEffect(() => {
    if (module.id) {
      setModuleData({
        name: module.name || "",
        description: module.description || "",
        start_time: module.start_time
          ? new Date(module.start_time).toISOString().slice(0, 16)
          : "",
        end_time: module.end_time
          ? new Date(module.end_time).toISOString().slice(0, 16)
          : "",
        assigned_students: module.assigned_students || [],
      });
      setTasks(module.tasks || []);
    } else {
      setModuleData(initialModuleData);
      setTasks([]);
    }
  }, [module]);

  const handleModuleChange = (e) => {
    setModuleData({ ...moduleData, [e.target.name]: e.target.value });
  };

  const handleStudentClick = (studentId) => {
    const selected = [...moduleData.assigned_students];
    const index = selected.indexOf(studentId);
    if (index > -1) {
      selected.splice(index, 1);
    } else {
      selected.push(studentId);
    }
    setModuleData({ ...moduleData, assigned_students: selected });
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
        if (resetFormAfterSubmit) {
          setModuleData(initialModuleData);
          setTasks([]);
        }
      }
      onModuleCreated();
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
            />
          </Grid>
          <Grid item xs={12}>
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
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="h6">Assign to Students</Typography>
            <List>
              {students.map((student) => (
                <ListItem
                  key={student.id}
                  button
                  selected={moduleData.assigned_students.includes(student.id)}
                  onClick={() => handleStudentClick(student.id)}
                >
                  <ListItemText primary={student.username} />
                </ListItem>
              ))}
            </List>
          </Grid>
        </Grid>
        <Box my={2}>
          <Button variant="outlined" color="primary" onClick={handleAddTask}>
            Add Task
          </Button>
          <Grid container spacing={3}>
            {tasks.map((task, index) => (
              <Grid item xs={12} key={index}>
                <Card>
                  <CardContent>
                    <TaskForm
                      task={task}
                      onChange={(updatedTask) =>
                        handleTaskChange(index, updatedTask)
                      }
                    />
                  </CardContent>
                  <CardActions>
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={() => handleRemoveTask(index)}
                    >
                      Remove Task
                    </Button>
                  </CardActions>
                </Card>
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
