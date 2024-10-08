import React, { useState, useEffect } from "react";
import { createChatSession } from "../utils/api";
import ChatInterface from "./ChatInterface";
import { Box, Typography } from "@mui/material";
import { useSnackbar } from "notistack";

function ModuleInteraction({ moduleId, selectedTask, clearChat }) {
  const [error, setError] = useState(null);
  const [chatSession, setChatSession] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (selectedTask) {
      startChatSession(selectedTask.id);
    }
  }, [selectedTask]);

  const startChatSession = async (taskId) => {
    try {
      if (clearChat) {
        setChatSession(null);
      }
      const session = await createChatSession(moduleId, taskId);
      setChatSession(session);
    } catch (error) {
      console.error("Error creating chat session:", error.message);
      enqueueSnackbar(error.message, { variant: "error" });
      setError(error.message);
    }
  };

  // const handleCompleteTask = () => {
  //   enqueueSnackbar("Task completed!", { variant: "success" });
  //   confetti({
  //     particleCount: 100,
  //     spread: 70,
  //     origin: { y: 0.6 },
  //   });
  //   onCompleteTask(selectedTask.id);
  // };

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
      {chatSession ? (
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="space-between"
          flexGrow={1}
          p={2}
          sx={{ width: "100%" }}
        >
          <ChatInterface
            session={chatSession}
            clearChat={clearChat}
            persona={selectedTask.persona}
          />
        </Box>
      ) : (
        <Typography>Loading chat session...</Typography>
      )}
    </Box>
  );
}

export default ModuleInteraction;
