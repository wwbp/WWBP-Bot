import React, { useState, useEffect } from "react";
import { fetchData, postData } from "../utils/api";

function CreateTask() {
  const [task, setTask] = useState({
    title: "",
    content: "",
    module: "",
    assigned_to: "",
    due_date: "",
  });
  const [modules, setModules] = useState([]);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    fetchData("/modules/")
      .then((data) => {
        setModules(data);
      })
      .catch((error) => {
        alert("Error loading modules");
      });

    fetchData("/users/")
      .then((data) => {
        const studentUsers = data.filter((user) => user.role === "student");
        setStudents(studentUsers);
      })
      .catch((error) => {
        alert("Error loading students");
      });
  }, []);

  const handleChange = (e) => {
    setTask({ ...task, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await postData("/tasks/", task);
      alert("Task created successfully!");
      setTask({
        title: "",
        content: "",
        module: "",
        assigned_to: "",
        due_date: "",
      });
    } catch (error) {
      alert("Error creating task");
    }
  };

  return (
    <div>
      <h1>Create Task</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Title:</label>
          <input
            type="text"
            name="title"
            value={task.title}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Content:</label>
          <textarea
            name="content"
            value={task.content}
            onChange={handleChange}
          ></textarea>
        </div>
        <div>
          <label>Module:</label>
          <select name="module" value={task.module} onChange={handleChange}>
            <option value="">Select Module</option>
            {modules.map((mod) => (
              <option key={mod.id} value={mod.id}>
                {mod.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Assign To:</label>
          <select
            name="assigned_to"
            value={task.assigned_to}
            onChange={handleChange}
          >
            <option value="">Select Student</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.username}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Due Date:</label>
          <input
            type="date"
            name="due_date"
            value={task.due_date}
            onChange={handleChange}
          />
        </div>
        <button type="submit">Create Task</button>
      </form>
    </div>
  );
}

export default CreateTask;
