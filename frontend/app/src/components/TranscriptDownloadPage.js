import React, { useState } from "react";
import { Button, TextField, Box, Typography } from "@mui/material";
import { downloadTranscript } from "../utils/api";

const TranscriptDownloadPage = () => {
  const [moduleId, setModuleId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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
        <TextField
          label="Module ID"
          variant="outlined"
          value={moduleId}
          onChange={(e) => setModuleId(e.target.value)}
        />
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
