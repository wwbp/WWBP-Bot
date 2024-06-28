import React, { useState, useEffect } from "react";
import { createChatSession } from "../utils/api";
import ChatInterface from "./ChatInterface";
import { Box, Typography, Button } from "@mui/material";
import { useSnackbar } from "notistack";
import confetti from "canvas-confetti";

function ModuleInteraction({ moduleId, selectedTask }) {
  const [error, setError] = useState(null);
  const [chatSession, setChatSession] = useState(null);
  const [clearChat, setClearChat] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const { enqueueSnackbar } = useSnackbar();

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
      enqueueSnackbar(error.message, { variant: "error" });
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

  const handleCompleteTask = () => {
    enqueueSnackbar("Task completed!", { variant: "success" });
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
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
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
        p={2}
      >
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
          display="flex"
          flexDirection="column"
          justifyContent="space-between"
          flexGrow={1}
          p={2}
          sx={{ width: "100%" }}
        >
          <ChatInterface session={chatSession} clearChat={clearChat} />
          <Box display="flex" justifyContent="space-between" mt={2}>
            <Button
              onClick={handleCompleteTask}
              variant="contained"
              color="primary"
            >
              Complete Task
            </Button>
            <Button
              onClick={() =>
                enqueueSnackbar("Message sent!", { variant: "success" })
              }
              variant="contained"
              color="primary"
            >
              Send
            </Button>
          </Box>
        </Box>
      ) : (
        <Typography>Loading chat session...</Typography>
      )}
    </Box>
  );
}

export default ModuleInteraction;
