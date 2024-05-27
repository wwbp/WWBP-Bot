import React, { useState, useEffect } from "react";
import { fetchData, deleteData } from "../utils/api";
import ModuleForm from "./ModuleForm";
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardActions,
} from "@mui/material";

function TeacherDashboard() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingModule, setEditingModule] = useState(null);

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
  };

  const handleEditClick = (module) => {
    setEditingModule(module);
  };

  const handleDeleteClick = async (moduleId) => {
    try {
      await deleteData(`/modules/${moduleId}/`);
      handleModuleCreated(); // Refresh the module list after deletion
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <Box py={5}>
      <Typography variant="h4" gutterBottom>
        Teacher Dashboard
      </Typography>
      {error && <Typography color="error">Error: {error}</Typography>}
      <Button
        variant="contained"
        color="primary"
        onClick={() => setEditingModule({})}
      >
        Add Module
      </Button>
      {editingModule && (
        <ModuleForm
          module={editingModule}
          onModuleCreated={handleModuleCreated}
          onClose={() => setEditingModule(null)}
        />
      )}
      <Typography variant="h5" gutterBottom>
        Modules
      </Typography>
      {loading ? (
        <Box textAlign="center" py={5}>
          <CircularProgress />
        </Box>
      ) : modules.length === 0 ? (
        <Typography>No modules available</Typography>
      ) : (
        <Grid container spacing={3}>
          {modules.map((module) => (
            <Grid item xs={12} sm={6} md={4} key={module.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{module.name}</Typography>
                  <Typography variant="body2">{module.description}</Typography>
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
                  >
                    Delete
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

export default TeacherDashboard;
