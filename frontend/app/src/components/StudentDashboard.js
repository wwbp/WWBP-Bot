import React from "react";
import { Box, Typography } from "@mui/material";
import { Routes, Route } from "react-router-dom";
import ModuleList from "./ModuleList";
import ModuleTasks from "./ModuleTasks";

function StudentDashboard() {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h5" gutterBottom>
        Student Dashboard
      </Typography>
      <Routes>
        <Route path="/" element={<ModuleList />} />
        <Route path="/module/:moduleId" element={<ModuleTasks />} />
      </Routes>
    </Box>
  );
}

export default StudentDashboard;
