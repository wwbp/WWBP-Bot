import React, { useState, useEffect } from "react";
import { postData, putData } from "../utils/api";
import { Box, TextField, Button, Typography, Grid } from "@mui/material";
import { useSnackbar } from "notistack";
import FileUpload from "./FileUpload";

function ModuleForm({ module, onModuleCreated }) {
  const initialModuleData = { name: "", content: "", files: [] };
  const [moduleData, setModuleData] = useState(initialModuleData);
  const [submitted, setSubmitted] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (module.id) {
      setModuleData({
        name: module.name || "",
        content: module.content || "",
        files: module.files || [],
      });
    } else {
      setModuleData(initialModuleData);
    }
  }, [module]);

  const handleModuleChange = (e) => {
    setModuleData({ ...moduleData, [e.target.name]: e.target.value });
  };

  const handleFileUploaded = (filePath) => {
    setModuleData({ ...moduleData, files: [...moduleData.files, filePath] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (!moduleData.name) {
      enqueueSnackbar("Module name is required", { variant: "error" });
      return;
    }

    try {
      if (module.id) {
        await putData(`/modules/${module.id}/`, { ...moduleData });
        enqueueSnackbar("Module updated successfully!", { variant: "success" });
      } else {
        const newModule = await postData("/modules/", { ...moduleData });
        enqueueSnackbar("Module created successfully!", { variant: "success" });
        onModuleCreated(newModule);
        return;
      }
      onModuleCreated();
    } catch (error) {
      enqueueSnackbar(error.message, { variant: "error" });
    }
  };

  return (
    <Box py={5} display="flex" flexDirection="column" height="100%">
      <Typography variant="h6" gutterBottom>
        {module.id ? "Edit Module" : "Create Module"}
      </Typography>
      <form onSubmit={handleSubmit} style={{ flex: 1 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Name"
              name="name"
              value={moduleData.name}
              onChange={handleModuleChange}
              margin="normal"
              required
              error={submitted && !moduleData.name}
              helperText={submitted && !moduleData.name && "Name is required"}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Content"
              name="content"
              value={moduleData.content}
              onChange={handleModuleChange}
              margin="normal"
              multiline
              rows={5}
            />
          </Grid>
          <Grid item xs={12}>
            <FileUpload onFileUploaded={handleFileUploaded} />
          </Grid>
        </Grid>
        <Box display="flex" justifyContent="flex-end" mt={3}>
          <Button variant="contained" color="primary" type="submit">
            Save
          </Button>
        </Box>
      </form>
    </Box>
  );
}

export default ModuleForm;
