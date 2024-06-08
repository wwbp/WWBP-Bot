import React, { useState, useEffect } from "react";
import { TextField, Box, Button, Grid } from "@mui/material";
import { useSnackbar } from "notistack";

function TaskForm({ task, onChange, onRemove }) {
  const [taskData, setTaskData] = useState(task);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    setTaskData(task);
  }, [task]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedTask = { ...taskData, [name]: value };
    setTaskData(updatedTask);
    onChange(updatedTask);
  };

  const handleRemove = () => {
    enqueueSnackbar("Task removed", { variant: "info" });
    onRemove();
  };

  return (
    <Box mb={2}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Title"
            name="title"
            value={taskData.title}
            onChange={handleChange}
            margin="normal"
            required
            error={!taskData.title}
            helperText={!taskData.title && "Title is required"}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Content"
            name="content"
            value={taskData.content}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={4}
            required
            error={!taskData.content}
            helperText={!taskData.content && "Content is required"}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Instruction Prompt"
            name="instruction_prompt"
            value={taskData.instruction_prompt}
            onChange={handleChange}
            margin="normal"
            required
            error={!taskData.instruction_prompt}
            helperText={
              !taskData.instruction_prompt && "Instruction Prompt is required"
            }
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Persona Prompt"
            name="persona_prompt"
            value={taskData.persona_prompt}
            onChange={handleChange}
            margin="normal"
            required
            error={!taskData.persona_prompt}
            helperText={
              !taskData.persona_prompt && "Persona Prompt is required"
            }
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Time Allocated (in minutes)"
            name="time_allocated"
            type="number"
            value={taskData.time_allocated}
            onChange={handleChange}
            margin="normal"
            required
            error={!taskData.time_allocated}
            helperText={
              !taskData.time_allocated && "Time Allocated is required"
            }
          />
        </Grid>
        <Grid item xs={12}>
          <Button variant="outlined" color="secondary" onClick={handleRemove}>
            Remove Task
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}

export default TaskForm;
