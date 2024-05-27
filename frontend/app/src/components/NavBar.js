import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Menu,
  MenuItem,
  IconButton,
  Avatar,
} from "@mui/material";
import { postData } from "../utils/api";

function NavBar({
  isLoggedIn,
  role,
  isStudentView,
  setIsStudentView,
  handleLogout,
}) {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState(null);

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

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography
          variant="h6"
          style={{ flexGrow: 1 }}
          component={Link}
          to="/"
        >
          GritCoach
        </Typography>
        {isLoggedIn ? (
          <>
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
            <IconButton edge="end" color="inherit" onClick={handleMenu}>
              <Avatar />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              keepMounted
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem component={Link} to="/profile">
                Profile
              </MenuItem>
              <MenuItem onClick={onLogout}>Logout</MenuItem>
            </Menu>
          </>
        ) : (
          <Button color="inherit" component={Link} to="/login">
            Login
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
}

export default NavBar;
