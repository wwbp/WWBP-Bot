import React, { useState } from "react";

function TaskForm({ task, onChange }) {
  const [taskData, setTaskData] = useState(task);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedTask = { ...taskData, [name]: value };
    setTaskData(updatedTask);
    onChange(updatedTask);
  };

  return (
    <div>
      <div>
        <label>Title:</label>
        <input
          type="text"
          name="title"
          value={taskData.title}
          onChange={handleChange}
        />
      </div>
      <div>
        <label>Content:</label>
        <textarea
          name="content"
          value={taskData.content}
          onChange={handleChange}
        ></textarea>
      </div>
    </div>
  );
}

export default TaskForm;
