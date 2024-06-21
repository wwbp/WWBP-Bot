import React, { useState, useEffect } from "react";
import { fetchData, deleteData } from "../utils/api";
import ModuleForm from "./ModuleForm";
import SystemPromptForm from "./SystemPromptForm";
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
} from "@mui/material";
import { useSnackbar } from "notistack";

function TeacherDashboard() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

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

  const handleModuleCreated = () => {
    fetchData("/modules/")
      .then(setModules)
      .catch((error) => {
        enqueueSnackbar(error.message, { variant: "error" });
      });
    setSelectedModule(null);
  };

  const handleEditClick = (module) => {
    setSelectedModule(module);
  };

  const handleDeleteClick = async (moduleId) => {
    enqueueSnackbar("Are you sure you want to delete this module?", {
      variant: "warning",
      persist: true,
      action: (key) => (
        <>
          <Button
            onClick={async () => {
              try {
                await deleteData(`/modules/${moduleId}/`);
                handleModuleCreated();
                enqueueSnackbar("Module deleted successfully!", {
                  variant: "success",
                });
                closeSnackbar(key);
              } catch (error) {
                enqueueSnackbar(error.message, { variant: "error" });
              }
            }}
          >
            Yes
          </Button>
          <Button onClick={() => closeSnackbar(key)}>No</Button>
        </>
      ),
    });
  };

  const handleCloseForm = () => {
    setSelectedModule(null);
  };

  return (
    <Grid container spacing={3} py={5} px={3}>
      <Grid item xs={12} md={4}>
        <Typography variant="h5" gutterBottom>
          Modules
        </Typography>
        {error && <Typography color="error">Error: {error}</Typography>}
        {loading ? (
          <Box textAlign="center" py={5}>
            <CircularProgress />
          </Box>
        ) : modules.length === 0 ? (
          <Typography>No modules available</Typography>
        ) : (
          <Grid container spacing={3}>
            {modules.map((module) => (
              <Grid item xs={12} key={module.id}>
                <Card sx={{ backgroundColor: "#ffcccc", borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6">{module.name}</Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      onClick={() => handleEditClick(module)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="secondary"
                      onClick={() => handleDeleteClick(module.id)}
                      disabled={
                        selectedModule && selectedModule.id === module.id
                      }
                    >
                      Delete
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Grid>
      <Grid item xs={12} md={8}>
        <SystemPromptForm />
        <Typography variant="h5" gutterBottom>
          {selectedModule ? "Edit Module" : "Create Module"}
        </Typography>
        <ModuleForm
          module={selectedModule || {}}
          onModuleCreated={handleModuleCreated}
          onClose={handleCloseForm}
          resetFormAfterSubmit={true}
        />
      </Grid>
    </Grid>
  );
}

export default TeacherDashboard;
