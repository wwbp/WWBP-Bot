import React, { useState, useEffect } from "react";
import { fetchData, postData, putData } from "../utils/api";
import TaskForm from "./TaskForm";

function ModuleForm({ module, onModuleCreated, onClose }) {
  const [moduleData, setModuleData] = useState({
    name: module.name || "",
    description: module.description || "",
    start_time: module.start_time || "",
    end_time: module.end_time || "",
    assigned_students: module.assigned_students || [],
  });
  const [tasks, setTasks] = useState(module.tasks || []);
  const [students, setStudents] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData("/users/")
      .then((data) => {
        const studentUsers = data.filter((user) => user.role === "student");
        setStudents(studentUsers);
      })
      .catch((error) => {
        setError(error.message);
      });
  }, []);

  const handleModuleChange = (e) => {
    setModuleData({ ...moduleData, [e.target.name]: e.target.value });
  };

  const handleStudentChange = (e) => {
    const selectedOptions = Array.from(
      e.target.selectedOptions,
      (option) => option.value
    );
    setModuleData({ ...moduleData, assigned_students: selectedOptions });
  };

  const handleTaskChange = (index, updatedTask) => {
    const newTasks = tasks.map((task, i) => (i === index ? updatedTask : task));
    setTasks(newTasks);
  };

  const handleAddTask = () => {
    setTasks([...tasks, { title: "", content: "" }]);
  };

  const handleRemoveTask = (index) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (module.id) {
        await putData(`/modules/${module.id}/`, {
          ...moduleData,
          tasks,
        });
      } else {
        await postData("/modules/", {
          ...moduleData,
          tasks,
        });
      }
      onModuleCreated();
      onClose();
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div>
      <h1>{module.id ? "Edit Module" : "Create Module"}</h1>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>Name:</label>
          <input
            type="text"
            name="name"
            value={moduleData.name}
            onChange={handleModuleChange}
          />
        </div>
        <div>
          <label>Description:</label>
          <textarea
            name="description"
            value={moduleData.description}
            onChange={handleModuleChange}
          ></textarea>
        </div>
        <div>
          <label>Start Time:</label>
          <input
            type="datetime-local"
            name="start_time"
            value={moduleData.start_time}
            onChange={handleModuleChange}
          />
        </div>
        <div>
          <label>End Time:</label>
          <input
            type="datetime-local"
            name="end_time"
            value={moduleData.end_time}
            onChange={handleModuleChange}
          />
        </div>
        <div>
          <label>Assign to Students:</label>
          <select
            multiple
            name="assigned_students"
            value={moduleData.assigned_students}
            onChange={handleStudentChange}
          >
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.username}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Tasks:</label>
          {tasks.map((task, index) => (
            <div key={index}>
              <TaskForm
                task={task}
                onChange={(updatedTask) => handleTaskChange(index, updatedTask)}
              />
              <button type="button" onClick={() => handleRemoveTask(index)}>
                Remove Task
              </button>
            </div>
          ))}
          <button type="button" onClick={handleAddTask}>
            Add Task
          </button>
        </div>
        <button type="submit">
          {module.id ? "Update Module" : "Create Module"}
        </button>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </form>
    </div>
  );
}

export default ModuleForm;
