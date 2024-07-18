import React, { useState, useEffect } from "react";
import {
  Button,
  TextField,
  Box,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import { downloadTranscript, fetchData } from "../utils/api";

const TranscriptDownloadPage = () => {
  const [modules, setModules] = useState([]);
  const [moduleId, setModuleId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const data = await fetchData("/modules/");
        setModules(data);
      } catch (error) {
        console.error("Error fetching modules", error);
      }
    };
    fetchModules();
  }, []);

  const handleDownload = async () => {
    try {
      await downloadTranscript(moduleId, startDate, endDate);
    } catch (error) {
      console.error("Error downloading transcript", error);
    }
  };

  return (
    <Box className="transcript-download-page">
      <Typography variant="h4" component="h1" gutterBottom>
        Download Transcript
      </Typography>
      <Box
        component="form"
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        <FormControl variant="outlined">
          <InputLabel id="module-select-label">Module</InputLabel>
          <Select
            labelId="module-select-label"
            id="module-select"
            value={moduleId}
            onChange={(e) => setModuleId(e.target.value)}
            label="Module"
          >
            {modules.map((module) => (
              <MenuItem key={module.id} value={module.id}>
                {module.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Start Date (YYYY-MM-DD)"
          variant="outlined"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <TextField
          label="End Date (YYYY-MM-DD)"
          variant="outlined"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
        <Button variant="contained" color="primary" onClick={handleDownload}>
          Download
        </Button>
      </Box>
    </Box>
  );
};

export default TranscriptDownloadPage;
