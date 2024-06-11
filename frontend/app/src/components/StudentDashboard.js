import React from "react";
import { Box } from "@mui/material";
import { Routes, Route } from "react-router-dom";
import ModuleList from "./ModuleList";
import ModuleTasks from "./ModuleTasks";

function StudentDashboard() {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Routes>
        <Route path="/" element={<ModuleList />} />
        <Route path="/module/:moduleId" element={<ModuleTasks />} />
      </Routes>
    </Box>
  );
}

export default StudentDashboard;
