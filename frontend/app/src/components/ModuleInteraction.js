import React, { useState, useEffect } from "react";
import { fetchData, createChatSession } from "../utils/api";
import ChatInterface from "./ChatInterface";

function ModuleInteraction({ match }) {
  const { moduleId } = match.params;
  const [module, setModule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chatSession, setChatSession] = useState(null);

  useEffect(() => {
    fetchData(`/modules/${moduleId}/`)
      .then((data) => {
        setModule(data);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, [moduleId]);

  const startChatSession = async () => {
    try {
      const session = await createChatSession(moduleId);
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

  return (
    <div>
      <h1>{module.name}</h1>
      <p>{module.description}</p>
      <button onClick={startChatSession}>Start Chat Session</button>
      {chatSession && <ChatInterface session={chatSession} />}
    </div>
  );
}

export default ModuleInteraction;
