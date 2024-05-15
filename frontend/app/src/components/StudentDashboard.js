import React, { useState, useEffect } from "react";
import { fetchData } from "../utils/api";
import { Link } from "react-router-dom";

function StudentDashboard() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData("/modules/assigned/")
      .then((data) => {
        setModules(data);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Student Dashboard</h1>
      <h2>Active Modules</h2>
      {modules.length === 0 ? (
        <p>No active modules assigned to you</p>
      ) : (
        <ul>
          {modules.map((module) => (
            <li key={module.id}>
              <Link to={`/modules/${module.id}`}>{module.name}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default StudentDashboard;
