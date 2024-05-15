import React, { useState, useEffect } from "react";
import { fetchData, deleteData } from "../utils/api";
import ModuleForm from "./ModuleForm";

function TeacherDashboard() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingModule, setEditingModule] = useState(null);

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

  const handleModuleCreated = () => {
    fetchData("/modules/").then(setModules);
  };

  const handleEditClick = (module) => {
    setEditingModule(module);
  };

  const handleDeleteClick = async (moduleId) => {
    try {
      await deleteData(`/modules/${moduleId}/`);
      handleModuleCreated(); // Refresh the module list after deletion
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div>
      <h1>Teacher Dashboard</h1>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      <button onClick={() => setEditingModule({})}>Add Module</button>
      {editingModule && (
        <ModuleForm
          module={editingModule}
          onModuleCreated={handleModuleCreated}
          onClose={() => setEditingModule(null)}
        />
      )}
      <h2>Modules</h2>
      {loading ? (
        <div>Loading...</div>
      ) : modules.length === 0 ? (
        <p>No modules available</p>
      ) : (
        <ul>
          {modules.map((module) => (
            <li key={module.id}>
              {module.name} - {module.description}
              <button onClick={() => handleEditClick(module)}>Edit</button>
              <button onClick={() => handleDeleteClick(module.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default TeacherDashboard;
