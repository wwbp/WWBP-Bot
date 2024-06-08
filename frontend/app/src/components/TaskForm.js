import React, { useState, useEffect } from "react";
import { TextField, Box, Button, Grid } from "@mui/material";

function TaskForm({ task, onChange, onRemove }) {
  const [taskData, setTaskData] = useState(task);

  useEffect(() => {
    setTaskData(task);
  }, [task]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedTask = { ...taskData, [name]: value };
    setTaskData(updatedTask);
    onChange(updatedTask);
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
          />
        </Grid>
        <Grid item xs={12}>
          <Button variant="outlined" color="secondary" onClick={onRemove}>
            Remove Task
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}

export default TaskForm;
