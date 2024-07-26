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
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { fetchData, postData } from "../utils/api";

const TranscriptDownloadPage = () => {
  const [modules, setModules] = useState([]);
  const [moduleId, setModuleId] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [error, setError] = useState("");
  const [csvList, setCSVList] = useState([]);

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
    fetchUserCSVFiles();
  }, []);

  const fetchUserCSVFiles = async () => {
    try {
      const data = await fetchData("/csv_transcripts/");
      setCSVList(data);
    } catch (error) {
      console.error("Error fetching CSV files", error);
    }
  };

  const handleDownload = async () => {
    if (startDate && endDate && startDate > endDate) {
      setError("End date must be greater than start date.");
      return;
    }
    setError("");
    try {
      await postData("/csv_transcripts/", {
        module_id: moduleId,
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
      });
      fetchUserCSVFiles();
    } catch (error) {
      console.error("Error starting CSV creation", error);
    }
  };

  return (
    <Box
      className="transcript-download-page"
      sx={{ p: 3, border: "1px solid #ccc", borderRadius: 2 }}
    >
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
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={(newValue) => setStartDate(newValue)}
            renderInput={(params) => <TextField {...params} />}
          />
          <DatePicker
            label="End Date"
            value={endDate}
            onChange={(newValue) => setEndDate(newValue)}
            renderInput={(params) => <TextField {...params} />}
          />
        </LocalizationProvider>
        {error && <Typography color="error">{error}</Typography>}
        <Button variant="contained" color="primary" onClick={handleDownload}>
          Start CSV Creation
        </Button>
      </Box>
      <Typography variant="h6" component="h2" gutterBottom>
        Available CSV Files
      </Typography>
      <Box>
        {csvList.map((csv, index) => (
          <Box key={index}>
            <a href={csv.file_url} target="_blank" rel="noopener noreferrer">
              Download CSV for Module {csv.module_id} from {csv.start_date} to{" "}
              {csv.end_date}
            </a>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default TranscriptDownloadPage;
