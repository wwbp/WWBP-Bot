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
  Box,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import { postData } from "../utils/api";
import { useSnackbar } from "notistack";

function NavBar({
  isLoggedIn,
  role,
  isStudentView,
  setIsStudentView,
  handleLogout,
}) {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const { enqueueSnackbar } = useSnackbar();

  const onLogout = () => {
    handleLogout();
    enqueueSnackbar("Logged out successfully", { variant: "info" });
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
      enqueueSnackbar(error.message, { variant: "error" });
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
    <AppBar position="static" style={{ backgroundColor: "#ff1744" }}>
      <Toolbar>
        <Typography
          variant="h6"
          component={Link}
          to="/"
          style={{
            flexGrow: 1,
            color: "white",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          GritCoach
        </Typography>
        {isLoggedIn ? (
          <>
            {role === "teacher" && (
              <>
                <IconButton
                  color="inherit"
                  component={Link}
                  to="/teacher-dashboard"
                >
                  <HomeIcon />
                </IconButton>
                <Button
                  color="inherit"
                  onClick={toggleView}
                  style={{ display: "flex", alignItems: "center" }}
                >
                  {isStudentView ? "Student" : "Teacher"}
                  <SwapHorizIcon fontSize="small" style={{ marginLeft: 5 }} />
                </Button>
              </>
            )}
            {role === "student" && (
              <IconButton
                color="inherit"
                component={Link}
                to="/student-dashboard"
              >
                <HomeIcon />
              </IconButton>
            )}
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <IconButton edge="end" color="inherit" onClick={handleMenu}>
                <Avatar />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "right",
                }}
                keepMounted
                transformOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                sx={{
                  "& .MuiPaper-root": {
                    width: "200px", // Adjust the width as needed
                    marginTop: "10px", // Ensure the menu appears just below the navbar
                  },
                }}
              >
                <MenuItem component={Link} to="/profile" onClick={handleClose}>
                  Profile
                </MenuItem>
                <MenuItem onClick={onLogout}>Logout</MenuItem>
              </Menu>
            </Box>
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
