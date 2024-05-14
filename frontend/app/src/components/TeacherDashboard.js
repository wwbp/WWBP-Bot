import React from "react";
import { Link } from "react-router-dom";

function TeacherDashboard() {
  return (
    <div>
      <h1>Teacher Dashboard</h1>
      <ul>
        <li>
          <Link to="/create-module">Create Module</Link>
        </li>
        <li>
          <Link to="/create-task">Create Task</Link>
        </li>
      </ul>
    </div>
  );
}

export default TeacherDashboard;
