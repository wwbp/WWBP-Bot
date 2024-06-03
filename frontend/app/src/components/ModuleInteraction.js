import React, { useState, useEffect } from "react";
import { fetchData, createChatSession } from "../utils/api";
import ChatInterface from "./ChatInterface";
import { useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  CircularProgress,
} from "@mui/material";

function ModuleInteraction() {
  const { moduleId } = useParams();
  const [module, setModule] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [chatSession, setChatSession] = useState(null);

  useEffect(() => {
    fetchData(`/modules/${moduleId}/`)
      .then((data) => {
        setModule(data);
        setTasks(data.tasks);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, [moduleId]);

  useEffect(() => {
    if (selectedTask) {
      startChatSession(selectedTask.id);
    }
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

  if (loading) {
    return (
      <Box textAlign="center" py={5}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" py={5}>
        <Typography color="error">Error: {error}</Typography>
      </Box>
    );
  }

  if (!module) {
    return (
      <Box textAlign="center" py={5}>
        <Typography>No module data available</Typography>
      </Box>
    );
  }

  return (
    <Box display="flex" height="100%">
      <Box width="30%" borderRight="1px solid #ddd" p={2}>
        <Typography variant="h5">{module.name}</Typography>
        <Typography variant="body1">{module.description}</Typography>
        <Typography variant="h6" gutterBottom>
          Tasks
        </Typography>
        <List>
          {tasks.map((task) => (
            <ListItem
              button
              onClick={() => setSelectedTask(task)}
              key={task.id}
            >
              <Typography>{task.title}</Typography>
            </ListItem>
          ))}
        </List>
      </Box>
      <Box
        width="70%"
        p={2}
        display="flex"
        flexDirection="column"
        height="100%"
      >
        {selectedTask && (
          <>
            <Typography variant="h6">{selectedTask.title}</Typography>
            <Typography variant="body1">{selectedTask.content}</Typography>
            {chatSession ? (
              <Box flexGrow={1} display="flex" flexDirection="column">
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
          </>
        )}
      </Box>
    </Box>
  );
}

export default ModuleInteraction;
