import React, { useState, useEffect } from "react";
import { fetchData } from "../utils/api";
import {
  Box,
  Typography,
  CircularProgress,
  Stack,
  Card,
  CardContent,
  Divider,
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
  }, []);

  function handleModuleSelection(module) {
    navigate(`/student-dashboard/module/${module.id}`);
  }

  function moduleCard(module) {
    return (
      <Card
        key={module.id}
        sx={{ borderRadius: 2, backgroundColor: "#ffcccc", color: "white" }}
        onClick={() => handleModuleSelection(module)}
      >
        <CardContent>
          <Typography variant="h5" gutterBottom>
            {module.name}
          </Typography>
          <Typography variant="subtitle1" sx={{ marginBottom: 2 }}>
            {module.description}
          </Typography>
          <Divider sx={{ marginBottom: 2 }} />
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Box textAlign="center" py={5}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h5" gutterBottom>
        Active Modules
      </Typography>
      {modules.length === 0 ? (
        <Typography>No active modules assigned to you</Typography>
      ) : (
        <Stack spacing={2}>{modules.map((module) => moduleCard(module))}</Stack>
      )}
    </Box>
  );
}

export default ModuleList;
