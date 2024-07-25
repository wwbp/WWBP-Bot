import React, { useState, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { Routes, Route, useParams } from "react-router-dom";
import ModuleList from "./ModuleList";
import ModuleTasks from "./ModuleTasks";
import { fetchData } from "../utils/api"; 

function StudentDashboard() {
  return (
    <Box sx={{ display: "flex", height: "100vh", flexDirection: "column" }}>
      <Box sx={{ borderBottom: "1px solid #e0e0e0", padding: 2 }}>
        <Routes>
          <Route path="/module/:moduleId" element={<ModuleHeader />} />
        </Routes>
      </Box>
      <Box sx={{ display: "flex", flexGrow: 1 }}>
        <Routes>
          <Route path="/" element={<ModuleList />} />
          <Route path="/module/:moduleId" element={<ModuleTasks />} />
        </Routes>
      </Box>
    </Box>
  );
}

function ModuleHeader() {
  const { moduleId } = useParams();
  const [module, setModule] = useState(null);

  useEffect(() => {
    fetchData(`/modules/${moduleId}/`).then((data) => setModule(data));
  }, [moduleId]);

  return (
    <Typography variant="h5">{module ? module.name : "Module Name"}</Typography>
  );
}

export default StudentDashboard;
