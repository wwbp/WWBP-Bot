import React, { useState, useEffect } from "react";
import { fetchData, postData, putData } from "../utils/api";

function TaskForm({ module, onClose, editingTask }) {
  const [task, setTask] = useState({
    title: editingTask ? editingTask.title : "",
    content: editingTask ? editingTask.content : "",
    module: module.id,
    assigned_to: editingTask ? editingTask.assigned_to : "",
  });
  const [students, setStudents] = useState([]);

  useEffect(() => {
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
      if (editingTask) {
        await putData(`/tasks/${editingTask.id}/`, task);
      } else {
        await postData("/tasks/", task);
      }
      alert("Task saved successfully!");
      onClose();
    } catch (error) {
      alert("Error saving task");
    }
  };

  return (
    <div>
      <h2>{editingTask ? "Edit Task" : "Create Task"}</h2>
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
        <button type="submit">Save Task</button>
      </form>
    </div>
  );
}

export default TaskForm;
