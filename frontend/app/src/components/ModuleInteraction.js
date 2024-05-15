import React, { useState, useEffect } from "react";
import { fetchData, createChatSession } from "../utils/api";
import ChatInterface from "./ChatInterface";
import { useParams } from "react-router-dom";

function ModuleInteraction() {
  const { moduleId } = useParams();
  const [module, setModule] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [chatSession, setChatSession] = useState(null);

  useEffect(() => {
    fetchData(`/modules/${moduleId}/`)
      .then((data) => {
        setModule(data);
        setTasks(data.tasks);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, [moduleId]);

  useEffect(() => {
    if (selectedTask) {
      console.log("Selected Task:", selectedTask);
      startChatSession(selectedTask.id);
    }
  }, [selectedTask]);

  const startChatSession = async (taskId) => {
    try {
      const session = await createChatSession(moduleId, taskId);
      console.log("Chat Session Created:", session);
      setChatSession(session);
    } catch (error) {
      setError(error.message);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!module) {
    return <div>No module data available</div>;
  }

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <div
        style={{ width: "30%", borderRight: "1px solid #ddd", padding: "10px" }}
      >
        <h2>{module.name}</h2>
        <p>{module.description}</p>
        <h3>Tasks</h3>
        <ul>
          {tasks.map((task) => (
            <li key={task.id}>
              <button onClick={() => setSelectedTask(task)}>
                {task.title}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div
        style={{
          width: "70%",
          padding: "10px",
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        {selectedTask && (
          <>
            <h3>{selectedTask.title}</h3>
            <p>{selectedTask.content}</p>
            {chatSession ? (
              <div
                style={{
                  flexGrow: 1,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <ChatInterface session={chatSession} />
                <button
                  onClick={() => alert("Task completed!")}
                  style={{
                    marginTop: "10px",
                    padding: "10px",
                    borderRadius: "5px",
                    border: "none",
                    background: "#28a745",
                    color: "#fff",
                  }}
                >
                  Complete Task
                </button>
              </div>
            ) : (
              <button onClick={() => startChatSession(selectedTask.id)}>
                Start Chat Session
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ModuleInteraction;
