import React, { useState, useEffect } from "react";
import { fetchData, putData, postData } from "../utils/api";
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
} from "@mui/material";

function SystemPromptForm() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData("/system_prompts/")
      .then((data) => {
        if (data.length > 0) {
          setSystemPrompt(data[0].prompt);
        }
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, []);

  const handleChange = (e) => {
    setSystemPrompt(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetchData("/system_prompts/");
      if (response.length > 0) {
        await putData(`/system_prompts/${response[0].id}/`, {
          prompt: systemPrompt,
        });
      } else {
        await postData("/system_prompts/", { prompt: systemPrompt });
      }
      setLoading(false);
    } catch (error) {
      setError(error.message);
      setLoading(false);
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
    <Box my={3}>
      {error && <Typography color="error">Error: {error}</Typography>}
      <Typography variant="h6" gutterBottom>
        System Prompt
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          multiline
          rows={4}
          variant="outlined"
          value={systemPrompt}
          onChange={handleChange}
          margin="normal"
        />
        <Button variant="contained" color="primary" type="submit">
          Save
        </Button>
      </form>
    </Box>
  );
}

export default SystemPromptForm;
