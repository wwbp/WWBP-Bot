import React, { useState, useEffect } from "react";
import { fetchData, deleteData } from "../utils/api";
import ModuleForm from "./ModuleForm";
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

function TeacherDashboard() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);

  useEffect(() => {
    fetchData("/modules/")
      .then((data) => {
        setModules(data);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, []);

  const handleModuleCreated = () => {
    fetchData("/modules/").then(setModules);
    setSelectedModule(null); // Clear the form after creation
  };

  const handleEditClick = (module) => {
    setSelectedModule(module);
  };

  const handleDeleteClick = async (moduleId) => {
    try {
      await deleteData(`/modules/${moduleId}/`);
      handleModuleCreated(); // Refresh the module list after deletion
    } catch (error) {
      setError(error.message);
    }
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
                <Card>
                  <CardContent>
                    <Typography variant="h6">{module.name}</Typography>
                    <Typography variant="body2">
                      {module.description}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      color="primary"
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
