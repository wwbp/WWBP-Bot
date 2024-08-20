import React, { useState, useEffect } from "react";
import { fetchData } from "../utils/api";
import { useParams } from "react-router-dom";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Paper,
} from "@mui/material";
import ModuleInteraction from "./ModuleInteraction";
import { useSnackbar } from "notistack";
import Grid from "@mui/material/Grid";
import LockIcon from "@mui/icons-material/Lock";
import RedoIcon from "@mui/icons-material/Redo";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import confetti from "canvas-confetti";
import Checkbox from "@mui/material/Checkbox";

function ModuleTasks() {
  const { moduleId } = useParams();
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [redoingTask, setRedoingTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    fetchData(`/modules/${moduleId}/tasks/`)
      .then((taskData) => {
        const updatedTasks = taskData.map((task, index) => ({
          ...task,
          locked: index !== 0,
          completed: false,
        }));
        setTasks(updatedTasks);
        setLoading(false);
      })
      .catch((error) => {
        enqueueSnackbar(error.message, { variant: "error" });
        setLoading(false);
      });
  }, [moduleId]);

  const handleTaskSelection = (task,event) => {

    if(event.target.type === "checkbox") {
      return;
    }

    if (!task.locked) {
      setRedoingTask(task.completed ? task : null);
      setSelectedTask(task);
    }
  };

  const handleCompleteTask = (taskId) => {
    enqueueSnackbar("Task completed!", { variant: "success" });
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    const updatedTasks = tasks.map((task, index) => {
      if (task.id === taskId) {
        task.completed = true;
      }
      if (index === tasks.findIndex((t) => t.id === taskId) + 1) {
        task.locked = false;
      }
      return task;
    });
    setTasks(updatedTasks);
    const nextTask = updatedTasks.find(
      (task, index) => index === tasks.findIndex((t) => t.id === taskId) + 1
    );
    setSelectedTask(nextTask);
    setRedoingTask(null);
  };

  const handleUncheckedTask = (taskId) => {
    updatingTasks(tasks, taskId, setTasks);
  }

  const toggleTask = (id)=>{
    tasks.map(task=>{
      if(task.id === id){
        if(!task.completed)
        {
          handleCompleteTask(id);
        }else{
          handleUncheckedTask(id);
        }
      }
      return task;
    });
  };

  if (loading) {
    return (
      <Box textAlign="center" py={5}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Grid container sx={{ height: "100vh" }}>
      <Grid
        item
        xs={12}
        md={3}
        sx={{
          backgroundColor: "white",
          color: "black",
          overflowY: "auto",
          borderRight: "1px solid #e0e0e0",
          height: "100%",
        }}
      >
        {tasks.length === 0 ? (
          <Typography>No tasks available</Typography>
        ) : (
          <List dense sx={{ p: 2 }}>
            {tasks.map((task) => (
              <Paper
                elevation={3}
                sx={{
                  ":hover": {
                    backgroundColor: task.locked
                      ? "#f0f0f0"
                      : task.completed
                      ? "#d3d3d3"
                      : "#e0e0e0",
                    cursor: task.locked ? "default" : "pointer",
                  },
                  marginBottom: 2,
                  padding: 2,
                  borderRadius: 2,
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "flex-start",
                  alignItems: "center",
                  height: "120px",
                  backgroundColor:
                    task === selectedTask
                      ? "#cfe8fc"
                      : task.locked
                      ? "#f0f0f0"
                      : task.completed
                      ? "#d3d3d3"
                      : "white",
                  border: task === selectedTask ? "2px solid #1976d2" : "none",
                  position: "relative",
                  width: "100%",
                  pointerEvents: task.locked ? "none" : "auto",
                  color: task.locked ? "grey" : "black",
                }}
                onClick={(event) => handleTaskSelection(task,event)}
                key={task.id}
              >
                <div style={{ display: 'flex', alignItems: 'center', width: '15%' }}>
                  <Checkbox
                    icon={<RadioButtonUncheckedIcon />}
                    checkedIcon={<CheckCircleIcon />}
                    checked={task.completed}
                    onChange={(event) => {
                      event.stopPropagation();
                      toggleTask(task.id)}}
                    disabled={task.locked}
                    sx={{
                      padding: 0, 
                      marginRight: '10px', 

                    }}
                  />
                  <div style={{ flex: 1, textAlign: 'center', alignSelf:'center' }}>{task.name}</div>
                </div>                 
                {task.locked && (
                  <LockIcon style={{ position: "absolute", top: 8, left: 8 }} />
                )}
                {task.completed && (
                  <CheckCircleIcon
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      color: "green",
                    }}
                  />
                )}
                {redoingTask && task === redoingTask && (
                  <RedoIcon
                    style={{
                      position: "absolute",
                      top: 8,
                      left: 8,
                      color: "orange",
                    }}
                  />
                )}
                <ListItem>
                  <ListItemText
                    primary={task.title}
                    sx={{ textAlign: "center" }}
                  />
                </ListItem>
              </Paper>
            ))}
          </List>
        )}
      </Grid>
      <Grid item xs={12} md={9} sx={{ height: "100%" }}>
        {selectedTask ? (
          <ModuleInteraction
            moduleId={moduleId}
            selectedTask={selectedTask}
            onCompleteTask={handleCompleteTask}
            clearChat={true} // Clear chat on task switch
          />
        ) : (
          <Box
            p={2}
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <Typography variant="h5">
              Please select the first task to begin!
            </Typography>
          </Box>
        )}
      </Grid>
    </Grid>
  );
}

export default ModuleTasks;

function updatingTasks(tasks, taskId, setTasks) {
  const updatedTasks = tasks.map((task) => {
    if (task.id === taskId) {
      task.completed = !task.completed;
      task.selected = false;
    }
    return task;
  });
  setTasks(updatedTasks);
}
