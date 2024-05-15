import React, { useState, useEffect } from "react";
import { fetchData } from "../utils/api";
import ModuleForm from "./ModuleForm";

function TeacherDashboard() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModuleForm, setShowModuleForm] = useState(false);

  useEffect(() => {
    fetchData("/modules/")
      .then((data) => {
        setModules(data);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, []);

  const toggleModuleForm = () => {
    setShowModuleForm(!showModuleForm);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Teacher Dashboard</h1>
      <button onClick={toggleModuleForm}>
        {showModuleForm ? "Hide Module Form" : "Add Module"}
      </button>
      {showModuleForm && (
        <ModuleForm
          onModuleCreated={() => fetchData("/modules/").then(setModules)}
        />
      )}
      <h2>Modules</h2>
      {modules.length === 0 ? (
        <p>No modules available</p>
      ) : (
        <ul>
          {modules.map((module) => (
            <li key={module.id}>
              {module.name} - {module.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default TeacherDashboard;
