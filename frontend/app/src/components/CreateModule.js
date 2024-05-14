import React, { useState } from "react";
import { postData } from "../utils/api";

function CreateModule() {
  const [module, setModule] = useState({
    name: "",
    description: "",
    start_time: "",
    end_time: "",
  });

  const handleChange = (e) => {
    setModule({ ...module, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await postData("/modules/", module);
      alert("Module created successfully!");
      setModule({ name: "", description: "", start_time: "", end_time: "" });
    } catch (error) {
      alert("Error creating module");
    }
  };

  return (
    <div>
      <h1>Create Module</h1>
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
        <button type="submit">Create Module</button>
      </form>
    </div>
  );
}

export default CreateModule;
