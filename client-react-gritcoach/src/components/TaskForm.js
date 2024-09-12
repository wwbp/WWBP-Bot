import React, { useState, useEffect } from "react";
import { postData, putData } from "../utils/api";
import { TextField, Box, Button, Grid } from "@mui/material";
import { useSnackbar } from "notistack";
import FileUpload from "./FileUpload";

const TaskForm = ({ task, moduleId, onTaskCreated }) => {
  const initialTaskData = {
    title: "",
    content: "",
    instruction_prompt: "",
    persona: {
      name: "",
      instructions: "",
    },
    files: [],
  };

  const [taskData, setTaskData] = useState(initialTaskData);
  const [submitted, setSubmitted] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (task.id) {
      setTaskData({
        title: task.title,
        content: task.content,
        instruction_prompt: task.instruction_prompt,
        persona: task.persona || { name: "", instructions: "" },
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

  const handleFileUploaded = (filePath) => {
    setTaskData({ ...taskData, files: [...taskData.files, filePath] });
  };

  const handleFileRemoved = (filePath) => {
    setTaskData({
      ...taskData,
      files: taskData.files.filter((file) => file !== filePath),
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
      // Step 1: Create Persona
      const personaResponse = await postData("/personas/", {
        name: taskData.persona.name,
        instructions: taskData.persona.instructions,
      });

      if (!personaResponse || !personaResponse.id) {
        enqueueSnackbar("Failed to create persona.", { variant: "error" });
        return;
      }

      const personaId = personaResponse.id;

      // Step 2: Create or Update Task
      const taskPayload = {
        ...taskData,
        persona_id: personaId, // Attach created persona
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
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Instruction Prompt"
              name="instruction_prompt"
              value={taskData.instruction_prompt}
              onChange={handleTaskChange}
              margin="normal"
              multiline
              rows={5}
            />
          </Grid>

          {/* Persona creation form */}
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
