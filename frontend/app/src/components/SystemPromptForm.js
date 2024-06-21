import React, { useState, useEffect } from "react";
import { fetchData, putData, postData } from "../utils/api";
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
} from "@mui/material";
import { useSnackbar } from "notistack";

function SystemPromptForm() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    fetchData("/system_prompts/")
      .then((data) => {
        if (data.length > 0) {
          setSystemPrompt(data[0].prompt);
        }
        setLoading(false);
      })
      .catch((error) => {
        enqueueSnackbar(error.message, { variant: "error" });
        setLoading(false);
      });
  }, []);

  const handleChange = (e) => {
    setSystemPrompt(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (!systemPrompt) {
      return;
    }

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
      enqueueSnackbar("System prompt saved successfully!", {
        variant: "success",
      });
      setLoading(false);
    } catch (error) {
      enqueueSnackbar(error.message, { variant: "error" });
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
          required
          error={submitted && !systemPrompt}
          helperText={submitted && !systemPrompt && "System prompt is required"}
        />
        <Button variant="contained" color="primary" type="submit">
          Save
        </Button>
      </form>
    </Box>
  );
}

export default SystemPromptForm;
