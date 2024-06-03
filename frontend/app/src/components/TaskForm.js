import React, { useState } from "react";
import { TextField, Box } from "@mui/material";

function TaskForm({ task, onChange }) {
  const [taskData, setTaskData] = useState(task);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedTask = { ...taskData, [name]: value };
    setTaskData(updatedTask);
    onChange(updatedTask);
  };

  return (
    <Box mb={2}>
      <TextField
        fullWidth
        label="Title"
        name="title"
        value={taskData.title}
        onChange={handleChange}
        margin="normal"
      />
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
    </Box>
  );
}

export default TaskForm;
