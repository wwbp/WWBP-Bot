import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  IconButton,
  Card,
  CardContent,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { postFile } from "../utils/api";

const FileUpload = ({ existingFiles = [], onFileUploaded, onFileRemoved }) => {
  const [uploadedFiles, setUploadedFiles] = useState(existingFiles);

  useEffect(() => {
    setUploadedFiles(existingFiles);
  }, [existingFiles]);

  const handleFileChange = async (e) => {
    const files = [...e.target.files];
    for (const file of files) {
      try {
        const response = await postFile("/upload/", file);
        setUploadedFiles([...uploadedFiles, response.file_path]);
        onFileUploaded(response.file_path);
      } catch (error) {
        console.error("Error uploading file:", error);
      }
    }
  };

  const handleRemoveFile = (filePath) => {
    setUploadedFiles(uploadedFiles.filter((file) => file !== filePath));
    onFileRemoved(filePath);
  };

  return (
    <Box>
      <input
        accept=".txt,.pdf,.doc,.docx,.json,.pptx,.html,.md,.tex,.c,.cpp,.cs,.java,.js,.php,.py,.rb,.sh,.ts,.css"
        style={{ display: "none" }}
        id="file-upload"
        multiple
        type="file"
        onChange={handleFileChange}
      />
      <label htmlFor="file-upload">
        <IconButton component="span">
          <UploadFileIcon />
        </IconButton>
      </label>
      <Grid container spacing={2} mt={2}>
        {uploadedFiles.map((file, index) => (
          <Grid item key={index}>
            <Card>
              <CardContent>
                <Typography variant="body2">{file}</Typography>
                <IconButton onClick={() => handleRemoveFile(file)}>
                  <DeleteIcon />
                </IconButton>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default FileUpload;
