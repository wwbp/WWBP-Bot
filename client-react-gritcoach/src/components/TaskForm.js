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
} from "@mui/material";
import { useSnackbar } from "notistack";
import FileUpload from "./FileUpload";
import AvatarUpload from "./AvatarUpload"; // Import the AvatarUpload component

const TaskForm = ({ task, moduleId, onTaskCreated }) => {
  const initialTaskData = {
    title: "",
    content: "",
    persona: {
      id: "",
      name: "",
      instructions: "",
      avatar_url: "", // Add avatar field to task data
    },
    files: [],
  };

  const [taskData, setTaskData] = useState(initialTaskData);
  const [personas, setPersonas] = useState([]); // To store list of personas
  const [submitted, setSubmitted] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    console.log("Persona Avatar:", taskData.persona.avatar_url);
  }, [taskData.persona.avatar_url]);

  useEffect(() => {
    // Fetch existing personas on load
    const fetchPersonas = async () => {
      try {
        const response = await fetchData("/personas/");
        setPersonas(response || []);
      } catch (error) {
        enqueueSnackbar("Failed to fetch personas", { variant: "error" });
      }
    };
    fetchPersonas();

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
          avatar_url: selectedPersona.avatar_url, // Load the avatar if it exists
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
    setTaskData({ ...taskData, files: [...taskData.files, filePath] });
  };

  const handleFileRemoved = (filePath) => {
    setTaskData({
      ...taskData,
      files: taskData.files.filter((file) => file !== filePath),
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
          avatar_url: taskData.persona.avatar_url, // Include avatar in update
        });
      } else {
        const personaResponse = await postData("/personas/", {
          name: taskData.persona.name,
          instructions: taskData.persona.instructions,
          avatar_url: taskData.persona.avatar_url, // Include avatar in create
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
          <Grid item xs={12}>
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
          </Grid>
          <Grid item xs={12}>
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
          </Grid>

          {/* Persona Dropdown */}
          <Grid item xs={12}>
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
          </Grid>

          <Grid item xs={12}>
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
          </Grid>

          <Grid item xs={12}>
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
          </Grid>

          {/* Avatar Upload */}
          <Grid item xs={12}>
            <AvatarUpload
              existingAvatar={taskData.persona.avatar_url}
              onAvatarUploaded={handleAvatarUploaded}
              onAvatarRemoved={handleAvatarRemoved}
            />
          </Grid>

          <Grid item xs={12}>
            <FileUpload
              existingFiles={taskData.files}
              onFileUploaded={handleFileUploaded}
              onFileRemoved={handleFileRemoved}
            />
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
