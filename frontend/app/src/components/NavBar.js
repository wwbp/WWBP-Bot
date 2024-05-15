import React from "react";
import { Link, useNavigate } from "react-router-dom";

function NavBar({ isLoggedIn, handleLogout }) {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");

  const onLogout = () => {
    handleLogout();
    navigate("/login");
  };

  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "space-around",
        marginBottom: "20px",
      }}
    >
      <Link to="/">Home</Link>
      {isLoggedIn ? (
        <>
          <Link to="/profile">Profile</Link>
          {role === "teacher" && (
            <Link to="/teacher-dashboard">Teacher Dashboard</Link>
          )}
          {role === "student" && (
            <Link to="/student-dashboard">Student Dashboard</Link>
          )}
          <button onClick={onLogout}>Logout</button>
        </>
      ) : (
        <>
          <Link to="/login">Login</Link>
          <Link to="/signup">Sign Up</Link>
        </>
      )}
    </nav>
  );
}

export default NavBar;
