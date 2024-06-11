import React, { useState, useEffect } from "react";
import { fetchData } from "../utils/api";
import {
  Box,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Grid,
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
      <Grid item xs={12} sm={6} md={4} lg={3} key={module.id}>
        <Card
          sx={{
            borderRadius: 2,
            backgroundColor: "#ffcccc",
            color: "white",
            cursor: "pointer",
          }}
          onClick={() => handleModuleSelection(module)}
        >
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {module.name}
            </Typography>
            <Typography variant="subtitle2" sx={{ marginBottom: 2 }}>
              {module.description}
            </Typography>
            <Divider sx={{ marginBottom: 2 }} />
          </CardContent>
        </Card>
      </Grid>
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
    <Box sx={{ flexGrow: 1, padding: 2 }}>
      <Typography variant="h5" gutterBottom>
        Modules
      </Typography>
      {modules.length === 0 ? (
        <Typography>No active modules assigned to you</Typography>
      ) : (
        <Grid container spacing={2}>
          {modules.map((module) => moduleCard(module))}
        </Grid>
      )}
    </Box>
  );
}

export default ModuleList;
