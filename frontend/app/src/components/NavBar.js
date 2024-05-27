import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppBar, Toolbar, Typography, Button } from "@mui/material";
import { postData } from "../utils/api";

function NavBar({
  isLoggedIn,
  role,
  isStudentView,
  setIsStudentView,
  handleLogout,
}) {
  const navigate = useNavigate();

  const onLogout = () => {
    handleLogout();
    navigate("/login");
  };

  const toggleView = async () => {
    try {
      const path = isStudentView
        ? "/switch_to_teacher_view/"
        : "/switch_to_student_view/";
      await postData(path);
      setIsStudentView(!isStudentView);
      if (isStudentView) {
        navigate("/teacher-dashboard");
      } else {
        navigate("/student-dashboard");
      }
      window.location.reload(); // Force a full page refresh to ensure correct rendering
    } catch (error) {
      console.error("Error toggling view", error);
    }
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" style={{ flexGrow: 1 }}>
          My Web App
        </Typography>
        <Button color="inherit" component={Link} to="/">
          Home
        </Button>
        {isLoggedIn ? (
          <>
            <Button color="inherit" component={Link} to="/profile">
              Profile
            </Button>
            {role === "teacher" && (
              <>
                <Button
                  color="inherit"
                  component={Link}
                  to={
                    isStudentView ? "/student-dashboard" : "/teacher-dashboard"
                  }
                >
                  {isStudentView ? "Student Dashboard" : "Teacher Dashboard"}
                </Button>
                <Button color="inherit" onClick={toggleView}>
                  {isStudentView ? "View as Teacher" : "View as Student"}
                </Button>
              </>
            )}
            {role === "student" && (
              <Button color="inherit" component={Link} to="/student-dashboard">
                Student Dashboard
              </Button>
            )}
            <Button color="inherit" onClick={onLogout}>
              Logout
            </Button>
          </>
        ) : (
          <>
            <Button color="inherit" component={Link} to="/login">
              Login
            </Button>
            <Button color="inherit" component={Link} to="/signup">
              Sign Up
            </Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
}

export default NavBar;
