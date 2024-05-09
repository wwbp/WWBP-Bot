import React, { useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import HomePage from "./components/HomePage";
import Login from "./components/Login";
import UserProfile from "./components/UserProfile";
import NavBar from "./components/NavBar";
import Signup from "./components/Signup";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <Router>
      <NavBar
        isLoggedIn={isLoggedIn}
        handleLogout={() => setIsLoggedIn(false)}
      />
      <Routes>
        <Route path="/" element={<HomePage />} exact />
        <Route path="/login" element={<Login setLoggedIn={setIsLoggedIn} />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route
          path="/signup"
          element={<Signup setLoggedIn={setIsLoggedIn} />}
        />
      </Routes>
    </Router>
  );
}

export default App;
