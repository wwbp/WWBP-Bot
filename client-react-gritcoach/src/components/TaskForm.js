import React, { useState, useEffect } from "react";
import { postData, putData, fetchData } from "../utils/api";
import {
  TextField,
  Box,
  Button,
  Grid,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Typography,
  Paper,
} from "@mui/material";
import { useSnackbar } from "notistack";
import FileUpload from "./FileUpload";
import AvatarUpload from "./AvatarUpload";

const TaskForm = ({ task, moduleId, onTaskCreated }) => {
  const initialTaskData = {
    title: "",
    content: "",
    persona: {
      id: "",
      name: "",
      instructions: "",
      avatar_url: "",
    },
    files: [],
  };

  const [taskData, setTaskData] = useState(initialTaskData);
  const [personas, setPersonas] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    // Fetch existing personas and task details
    const fetchPersonas = async () => {
      try {
        const response = await fetchData("/personas/");
        setPersonas(response || []);
      } catch (error) {
        enqueueSnackbar("Failed to fetch personas", { variant: "error" });
      }
    };
    fetchPersonas();

    // If task exists, populate the fields
    if (task.id) {
      setTaskData({
        title: task.title,
        content: task.content,
        persona: task.persona || {
          id: "",
          name: "",
          instructions: "",
          avatar_url: "",
        },
        files: task.files || [],
      });
    } else {
      setTaskData(initialTaskData);
    }
  }, [task]);

  const handleTaskChange = (e) => {
    const { name, value } = e.target;
    setTaskData({ ...taskData, [name]: value });
  };

  const handlePersonaChange = (e) => {
    const { name, value } = e.target;
    setTaskData({
      ...taskData,
      persona: { ...taskData.persona, [name]: value },
    });
  };

  const handlePersonaSelect = (e) => {
    const selectedPersonaId = e.target.value;
    if (selectedPersonaId) {
      const selectedPersona = personas.find((p) => p.id === selectedPersonaId);
      setTaskData({
        ...taskData,
        persona: {
          id: selectedPersona.id,
          name: selectedPersona.name,
          instructions: selectedPersona.instructions,
          avatar_url: selectedPersona.avatar_url, // Load avatar if it exists
        },
      });
    } else {
      setTaskData({
        ...taskData,
        persona: { id: "", name: "", instructions: "", avatar_url: "" },
      });
    }
  };

  const handleFileUploaded = (filePath) => {
    const fileName = filePath.split("/").pop();
    setTaskData({ ...taskData, files: [...taskData.files, fileName] });
  };

  const handleFileRemoved = (fileName) => {
    setTaskData({
      ...taskData,
      files: taskData.files.filter((file) => file !== fileName),
    });
  };

  const handleAvatarUploaded = (filePath) => {
    let fullUrl = filePath;
    if (!filePath.startsWith("http")) {
      const baseUrl = process.env.REACT_APP_API_URL;
      fullUrl = `${baseUrl}${filePath}`;
    }
    setTaskData({
      ...taskData,
      persona: { ...taskData.persona, avatar_url: fullUrl },
    });
  };

  const handleAvatarRemoved = () => {
    setTaskData({
      ...taskData,
      persona: { ...taskData.persona, avatar_url: "" },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (!taskData.title || !taskData.content) {
      enqueueSnackbar("Task title and content are required", {
        variant: "error",
      });
      return;
    }

    try {
      let personaId = taskData.persona.id;

      // Step 1: Create or Update Persona
      if (personaId) {
        await putData(`/personas/${personaId}/`, {
          name: taskData.persona.name,
          instructions: taskData.persona.instructions,
          avatar_url: taskData.persona.avatar_url,
        });
      } else {
        const personaResponse = await postData("/personas/", {
          name: taskData.persona.name,
          instructions: taskData.persona.instructions,
          avatar_url: taskData.persona.avatar_url,
        });

        if (!personaResponse || !personaResponse.id) {
          enqueueSnackbar("Failed to create persona.", { variant: "error" });
          return;
        }

        personaId = personaResponse.id;
      }

      // Step 2: Create or Update Task
      const taskPayload = {
        ...taskData,
        persona_id: personaId,
        module: moduleId,
      };

      if (task.id) {
        await putData(`/tasks/${task.id}/`, taskPayload);
        enqueueSnackbar("Task updated successfully!", { variant: "success" });
      } else {
        await postData(`/modules/${moduleId}/add_task/`, taskPayload);
        enqueueSnackbar("Task created successfully!", { variant: "success" });
      }

      onTaskCreated();
    } catch (error) {
      enqueueSnackbar(error.message, { variant: "error" });
    }
  };

  return (
    <Box py={5} display="flex" flexDirection="column" height="100%">
      <form onSubmit={handleSubmit} style={{ flex: 1 }}>
        <Grid container spacing={3}>
          {/* Section 1: Task Details */}
          <Grid item xs={12}>
            <Typography variant="h6">Task Details</Typography>
            <Paper variant="outlined" style={{ padding: 16 }}>
              <TextField
                fullWidth
                label="Title"
                name="title"
                value={taskData.title}
                onChange={handleTaskChange}
                autoComplete="off"
                margin="normal"
                required
                error={submitted && !taskData.title}
                helperText={submitted && !taskData.title && "Title is required"}
              />

              <FileUpload
                existingFiles={taskData.files}
                onFileUploaded={handleFileUploaded}
                onFileRemoved={handleFileRemoved}
              />

              <TextField
                fullWidth
                label="Content"
                name="content"
                value={taskData.content}
                onChange={handleTaskChange}
                margin="normal"
                multiline
                rows={5}
                required
                error={submitted && !taskData.content}
                helperText={
                  submitted && !taskData.content && "Content is required"
                }
              />
            </Paper>
          </Grid>

          {/* Section 2: Persona Details */}
          <Grid item xs={12}>
            <Typography variant="h6">Persona Details</Typography>
            <Paper variant="outlined" style={{ padding: 16 }}>
              {/* Persona Dropdown */}
              <FormControl fullWidth>
                <InputLabel shrink>Select Persona</InputLabel>
                <Select
                  value={taskData.persona.id || ""}
                  onChange={handlePersonaSelect}
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>Create New Persona</em>
                  </MenuItem>
                  {personas.map((persona) => (
                    <MenuItem key={persona.id} value={persona.id}>
                      {persona.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Persona Details */}
              <TextField
                fullWidth
                label="Persona Name"
                name="name"
                value={taskData.persona.name}
                onChange={handlePersonaChange}
                margin="normal"
                required
                helperText={
                  submitted &&
                  !taskData.persona.name &&
                  "Persona name is required"
                }
              />
              <TextField
                fullWidth
                label="Persona Instructions"
                name="instructions"
                value={taskData.persona.instructions}
                onChange={handlePersonaChange}
                margin="normal"
                multiline
                rows={3}
              />

              {/* Avatar Upload */}
              <AvatarUpload
                existingAvatar={taskData.persona.avatar_url}
                onAvatarUploaded={handleAvatarUploaded}
                onAvatarRemoved={handleAvatarRemoved}
              />
            </Paper>
          </Grid>
        </Grid>
        <Box display="flex" justifyContent="flex-end" mt={3}>
          <Button variant="contained" color="primary" type="submit">
            Save
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default TaskForm;
