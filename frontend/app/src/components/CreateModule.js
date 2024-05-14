import React, { useState } from "react";
import { postData } from "../utils/api";

function CreateModule() {
  const [module, setModule] = useState({
    name: "",
    description: "",
  });

  const handleChange = (e) => {
    setModule({ ...module, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await postData("/modules/", module);
      alert("Module created successfully!");
      setModule({ name: "", description: "" });
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
        <button type="submit">Create Module</button>
      </form>
    </div>
  );
}

export default CreateModule;
