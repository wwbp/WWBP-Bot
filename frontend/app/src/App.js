import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import HomePage from "./components/HomePage";
import Login from "./components/Login";
import UserProfile from "./components/UserProfile";
import NavBar from "./components/NavBar";
import Signup from "./components/Signup";
import TeacherDashboard from "./components/TeacherDashboard";
import CreateModule from "./components/CreateModule";
import CreateTask from "./components/CreateTask";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  return (
    <Router>
      <NavBar
        isLoggedIn={isLoggedIn}
        handleLogout={() => {
          localStorage.removeItem("token");
          setIsLoggedIn(false);
        }}
      />
      <Routes>
        <Route path="/" element={<HomePage isLoggedIn={isLoggedIn} />} />
        <Route path="/login" element={<Login setLoggedIn={setIsLoggedIn} />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route
          path="/signup"
          element={<Signup setLoggedIn={setIsLoggedIn} />}
        />
        <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
        <Route path="/create-module" element={<CreateModule />} />
        <Route path="/create-task" element={<CreateTask />} />
      </Routes>
    </Router>
  );
}

export default App;
