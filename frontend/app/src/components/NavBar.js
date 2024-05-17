import React from "react";
import { Link, useNavigate } from "react-router-dom";
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
            <>
              <Link
                to={isStudentView ? "/student-dashboard" : "/teacher-dashboard"}
              >
                {isStudentView ? "Student Dashboard" : "Teacher Dashboard"}
              </Link>
              <button onClick={toggleView}>
                {isStudentView ? "View as Teacher" : "View as Student"}
              </button>
            </>
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
