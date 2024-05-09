import React from "react";
import { Link } from "react-router-dom";

function NavBar({ isLoggedIn, handleLogout }) {
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
          <button onClick={handleLogout}>Logout</button>
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
