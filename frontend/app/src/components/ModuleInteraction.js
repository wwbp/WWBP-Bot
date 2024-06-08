import React, { useState, useEffect } from "react";
import { createChatSession } from "../utils/api";
import ChatInterface from "./ChatInterface";
import { Box, Typography, Button } from "@mui/material";

function ModuleInteraction({ moduleId, selectedTask }) {
  const [error, setError] = useState(null);
  const [chatSession, setChatSession] = useState(null);

  useEffect(() => {
    if (selectedTask) {
      startChatSession(selectedTask.id);
    }
    // Disabling lint because we can't add what it is asking for to the dependency array below.
    // eslint-disable-next-line
  }, [selectedTask]);

  const startChatSession = async (taskId) => {
    try {
      const session = await createChatSession(moduleId, taskId);
      setChatSession(session);
    } catch (error) {
      console.error("Error creating chat session:", error.message);
      setError(error.message);
    }
  };

  if (error) {
    return (
      <Box textAlign="center" py={5}>
        <Typography color="error">Error: {error}</Typography>
      </Box>
    );
  }

  if (!selectedTask) {
    return (
      <Box textAlign="center" py={5}>
        <Typography>No task selected</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: "90%" }} p={3}>
      <Typography variant="h6">{selectedTask.title}</Typography>
      <Typography variant="body1">{selectedTask.content}</Typography>
      {chatSession ? (
        <Box
          flexGrow={1}
          display="flex"
          flexDirection="column"
          sx={{ height: "100%" }}
        >
          <ChatInterface session={chatSession} />
          <Button
            onClick={() => alert("Task completed!")}
            variant="contained"
            color="primary"
            style={{ marginTop: "10px" }}
          >
            Complete Task
          </Button>
        </Box>
      ) : (
        <Typography>Loading chat session...</Typography>
      )}
    </Box>
  );
}

export default ModuleInteraction;
