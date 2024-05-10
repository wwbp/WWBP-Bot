import React from "react";
import { Link, useNavigate } from "react-router-dom";

function NavBar({ isLoggedIn, handleLogout }) {
  const navigate = useNavigate();

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
          <button onClick={onLogout}>Logout</button> {/* Use onLogout here */}
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
