import React, { useState, useEffect } from "react";
import { fetchData, postData } from "../utils/api";

function ModuleForm({ onModuleCreated }) {
  const [module, setModule] = useState({
    name: "",
    description: "",
    start_time: "",
    end_time: "",
    assigned_students: [],
  });
  const [tasks, setTasks] = useState([]);
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

  const handleChange = (e) => {
    setModule({ ...module, [e.target.name]: e.target.value });
  };

  const handleTaskChange = (index, e) => {
    const newTasks = tasks.slice();
    newTasks[index] = { ...newTasks[index], [e.target.name]: e.target.value };
    setTasks(newTasks);
  };

  const addTask = () => {
    setTasks([...tasks, { title: "", content: "" }]);
  };

  const removeTask = (index) => {
    const newTasks = tasks.slice();
    newTasks.splice(index, 1);
    setTasks(newTasks);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await postData("/modules/", { ...module, tasks });
      alert("Module created successfully!");
      setModule({
        name: "",
        description: "",
        start_time: "",
        end_time: "",
        assigned_students: [],
      });
      setTasks([]);
      onModuleCreated();
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div>
      <h1>Create Module</h1>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>Name:</label>
          <input
            type="text"
            name="name"
            value={module.name}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Description:</label>
          <textarea
            name="description"
            value={module.description}
            onChange={handleChange}
          ></textarea>
        </div>
        <div>
          <label>Start Time:</label>
          <input
            type="datetime-local"
            name="start_time"
            value={module.start_time}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>End Time:</label>
          <input
            type="datetime-local"
            name="end_time"
            value={module.end_time}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Assign to Students:</label>
          <select
            multiple
            name="assigned_students"
            value={module.assigned_students}
            onChange={(e) =>
              setModule({
                ...module,
                assigned_students: [...e.target.selectedOptions].map(
                  (o) => o.value
                ),
              })
            }
          >
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.username}
              </option>
            ))}
          </select>
        </div>
        <h3>Tasks</h3>
        {tasks.map((task, index) => (
          <div key={index}>
            <h4>Task {index + 1}</h4>
            <div>
              <label>Title:</label>
              <input
                type="text"
                name="title"
                value={task.title}
                onChange={(e) => handleTaskChange(index, e)}
              />
            </div>
            <div>
              <label>Content:</label>
              <textarea
                name="content"
                value={task.content}
                onChange={(e) => handleTaskChange(index, e)}
              ></textarea>
            </div>
            <button type="button" onClick={() => removeTask(index)}>
              Remove Task
            </button>
          </div>
        ))}
        <button type="button" onClick={addTask}>
          Add Task
        </button>
        <button type="submit">Create Module</button>
      </form>
    </div>
  );
}

export default ModuleForm;
