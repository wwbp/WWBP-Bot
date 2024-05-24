import React, { useState, useEffect } from "react";
import { fetchChatMessages, createWebSocket } from "../utils/api";

function ChatInterface({ session }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    fetchChatMessages(session.id)
      .then((data) => {
        setMessages(data || []);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });

    const ws = createWebSocket(session.id);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("WebSocket message received:", data); // Log for debugging
      if (data.error) {
        setError(data.error);
      } else {
        setMessages((prevMessages) => {
          const lastMessage = prevMessages[prevMessages.length - 1];
          if (lastMessage && lastMessage.sender === "bot") {
            lastMessage.message += data.message;
            return [...prevMessages];
          }
          return [
            ...prevMessages,
            { id: new Date().getTime(), sender: "bot", message: data.message },
          ];
        });
      }
    };
    ws.onerror = (event) => {
      console.error("WebSocket error observed:", event);
      setError("WebSocket connection error");
    };
    setSocket(ws);

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [session.id]);

  const handleSendMessage = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ message }));
      setMessages((prevMessages) => [
        ...prevMessages,
        { id: new Date().getTime(), sender: "student", message },
      ]);
      setMessage("");
    } else {
      setError("WebSocket connection is not open");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flexGrow: 1, overflowY: "auto", padding: "10px" }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ marginBottom: "10px" }}>
            <strong>{msg.sender}:</strong> {msg.message}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", padding: "10px" }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ flexGrow: 1, marginRight: "10px", padding: "10px" }}
        />
        <button onClick={handleSendMessage} style={{ padding: "10px" }}>
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatInterface;
