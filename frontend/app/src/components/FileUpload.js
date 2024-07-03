import React, { useState } from "react";
import { Box, Button, Typography, Grid, IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { postFile } from "../utils/api";

const FileUpload = ({ onFileUploaded }) => {
  const [files, setFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const handleFileChange = (e) => {
    setFiles([...e.target.files]);
  };

  const handleUpload = async () => {
    try {
      for (const file of files) {
        const response = await postFile("/upload/", file);
        setUploadedFiles([...uploadedFiles, response.file_path]);
        onFileUploaded(response.file_path);
      }
      setFiles([]);
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  const handleRemoveFile = (filePath) => {
    setUploadedFiles(uploadedFiles.filter((file) => file !== filePath));
  };

  return (
    <Box>
      <input type="file" multiple onChange={handleFileChange} />
      <Button onClick={handleUpload}>Upload</Button>
      <Grid container spacing={2} mt={2}>
        {uploadedFiles.map((file, index) => (
          <Grid item key={index}>
            <Box display="flex" alignItems="center">
              <Typography variant="body2">{file}</Typography>
              <IconButton onClick={() => handleRemoveFile(file)}>
                <DeleteIcon />
              </IconButton>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default FileUpload;
