import React, { useState, useEffect } from "react";
import { fetchData } from "../utils/api";
import {
  Box,
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";

function ModuleList() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData("/modules/")
      .then((data) => {
        setModules(data);
        setLoading(false);
      })
      .catch((error) => {
        enqueueSnackbar(error.message, { variant: "error" });
        setLoading(false);
      });
  }, [enqueueSnackbar]);

  function handleModuleSelection(module) {
    navigate(`/student-dashboard/module/${module.id}`);
  }

  if (loading) {
    return (
      <Box textAlign="center" py={5}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flexGrow: 1,
        padding: 2,
        backgroundColor: "#ffffff",
        borderRadius: 2,
      }}
    >
      <Typography variant="h5" gutterBottom>
        Modules
      </Typography>
      {modules.length === 0 ? (
        <Typography>No active modules assigned to you</Typography>
      ) : (
        <List>
          {modules.map((module) => (
            <React.Fragment key={module.id}>
              <Paper
                elevation={3}
                sx={{
                  backgroundColor: "white",
                  borderRadius: "50px",
                  margin: "10px 0",
                  padding: "10px 20px",
                }}
              >
                <ListItem button onClick={() => handleModuleSelection(module)}>
                  <ListItemText
                    primary={module.name}
                    secondary={module.description}
                  />
                </ListItem>
              </Paper>
              <Divider component="li" />
            </React.Fragment>
          ))}
        </List>
      )}
    </Box>
  );
}

export default ModuleList;
