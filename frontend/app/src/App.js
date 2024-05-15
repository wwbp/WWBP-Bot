import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import HomePage from "./components/HomePage";
import Login from "./components/Login";
import UserProfile from "./components/UserProfile";
import NavBar from "./components/NavBar";
import Signup from "./components/Signup";
import TeacherDashboard from "./components/TeacherDashboard";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userRole = localStorage.getItem("role");
    setIsLoggedIn(!!token);
    setRole(userRole);
  }, []);

  return (
    <Router>
      <NavBar
        isLoggedIn={isLoggedIn}
        role={role}
        handleLogout={() => {
          localStorage.removeItem("token");
          localStorage.removeItem("role");
          setIsLoggedIn(false);
          setRole("");
        }}
      />
      <Routes>
        <Route path="/" element={<HomePage isLoggedIn={isLoggedIn} />} />
        <Route
          path="/login"
          element={<Login setLoggedIn={setIsLoggedIn} setRole={setRole} />}
        />
        <Route path="/profile" element={<UserProfile />} />
        <Route
          path="/signup"
          element={<Signup setLoggedIn={setIsLoggedIn} setRole={setRole} />}
        />
        <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
