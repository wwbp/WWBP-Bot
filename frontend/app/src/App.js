import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { fetchData } from "./utils/api";
import HomePage from "./components/HomePage";
import Login from "./components/Login";
import UserProfile from "./components/UserProfile";
import NavBar from "./components/NavBar";
import Signup from "./components/Signup";
import TeacherDashboard from "./components/TeacherDashboard";
import StudentDashboard from "./components/StudentDashboard";
import { SnackbarProvider } from "notistack";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState("");
  const [isStudentView, setIsStudentView] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userRole = localStorage.getItem("role");
    setIsLoggedIn(!!token);
    setRole(userRole);

    if (userRole === "teacher") {
      const fetchViewMode = async () => {
        try {
          const response = await fetchData("/get_view_mode/");
          setIsStudentView(response.student_view);
        } catch (error) {
          console.error("Error fetching view mode", error);
        }
      };
      if (token) {
        fetchViewMode();
      }
    }
  }, []);

  return (
    <SnackbarProvider maxSnack={3}>
      <Router>
        <NavBar
          isLoggedIn={isLoggedIn}
          role={role}
          isStudentView={isStudentView}
          setIsStudentView={setIsStudentView}
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
          {role === "teacher" && !isStudentView && (
            <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
          )}
          {(role === "student" || isStudentView) && (
            <Route path="/student-dashboard" element={<StudentDashboard />} />
          )}
        </Routes>
      </Router>
    </SnackbarProvider>
  );
}

export default App;
