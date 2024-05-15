import React, { useState, useEffect } from "react";
import { fetchChatMessages, sendMessage } from "../utils/api";

function ChatInterface({ session }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
  }, [session.id]);

  const handleSendMessage = async () => {
    try {
      const newMessage = await sendMessage(session.id, message, "student");
      setMessages([
        ...messages,
        newMessage.user_message,
        newMessage.bot_message,
      ]);
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error.message);
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
