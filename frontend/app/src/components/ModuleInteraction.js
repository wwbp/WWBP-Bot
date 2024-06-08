import React, { useState, useEffect } from "react";
import { createChatSession } from "../utils/api";
import ChatInterface from "./ChatInterface";
import { Box, Typography, Button } from "@mui/material";

function ModuleInteraction({ moduleId, selectedTask }) {
  const [error, setError] = useState(null);
  const [chatSession, setChatSession] = useState(null);
  const [clearChat, setClearChat] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    let timer;
    if (selectedTask) {
      startChatSession(selectedTask.id);
      setClearChat(true);
      setElapsedTime(0);
      timer = setInterval(() => setElapsedTime((prev) => prev + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [selectedTask]);

  const startChatSession = async (taskId) => {
    try {
      const session = await createChatSession(moduleId, taskId);
      setChatSession(session);
      setClearChat(false);
    } catch (error) {
      console.error("Error creating chat session:", error.message);
      setError(error.message);
    }
  };

  const formatElapsedTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const getTimerColor = () => {
    const allocatedTimeInSeconds = selectedTask.time_allocated * 60;

    if (elapsedTime >= allocatedTimeInSeconds) {
      return "red";
    }
    if (elapsedTime >= allocatedTimeInSeconds - 60) {
      return "orange";
    }
    return "black";
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
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">{selectedTask.title}</Typography>
        <Typography
          variant="body1"
          style={{ color: getTimerColor(), marginLeft: "auto" }}
        >
          {formatElapsedTime(elapsedTime)}
        </Typography>
      </Box>
      {chatSession ? (
        <Box
          flexGrow={1}
          display="flex"
          flexDirection="column"
          sx={{ height: "100%" }}
        >
          <ChatInterface session={chatSession} clearChat={clearChat} />
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
