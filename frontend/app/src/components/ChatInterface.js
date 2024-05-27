import React, { useState, useEffect, useRef } from "react";
import { createWebSocket } from "../utils/api";
import { Box, TextField, Button, Typography } from "@mui/material";

function ChatInterface({ session }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(null);
  const ws = useRef(null);
  const messagesEndRef = useRef(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 5;
  let ongoingStream = null;

  const setupWebSocket = () => {
    ws.current = createWebSocket(session.id);

    ws.current.onopen = () => {
      console.log("WebSocket connected!");
      setReconnectAttempts(0);
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.event === "on_parser_start") {
        ongoingStream = { id: data.run_id, content: "" };
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: "Assistant", message: "", id: data.run_id },
        ]);
      } else if (
        data.event === "on_parser_stream" &&
        ongoingStream &&
        data.run_id === ongoingStream.id
      ) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === data.run_id
              ? { ...msg, message: msg.message + data.data.chunk }
              : msg
          )
        );
      }
    };

    ws.current.onerror = (event) => {
      console.error("WebSocket error observed:", event);
    };

    ws.current.onclose = (event) => {
      console.log(
        `WebSocket is closed now. Code: ${event.code}, Reason: ${event.reason}`
      );
      handleReconnect();
    };
  };

  const handleReconnect = () => {
    if (reconnectAttempts < maxReconnectAttempts) {
      let timeout = Math.pow(2, reconnectAttempts) * 1000;
      setTimeout(() => {
        setupWebSocket();
      }, timeout);
      setReconnectAttempts(reconnectAttempts + 1);
    } else {
      console.log(
        "Max reconnect attempts reached, not attempting further reconnects."
      );
    }
  };

  useEffect(() => {
    setupWebSocket();

    return () => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
    };
  }, [session.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInputChange = (e) => {
    setMessage(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const userMessage = { sender: "You", message: message };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    ws.current.send(JSON.stringify({ message: message }));
    setMessage("");
  };

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <Box flexGrow={1} overflow="auto" p={2}>
        {messages.map((msg) => (
          <Box key={msg.id} mb={2}>
            <Typography variant="body2" color="textSecondary">
              <strong>{msg.sender}:</strong> {msg.message}
            </Typography>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Box>
      <Box display="flex" p={2}>
        <TextField
          fullWidth
          value={message}
          onChange={handleInputChange}
          variant="outlined"
          placeholder="Type your message"
          margin="normal"
          style={{ marginRight: "10px" }}
        />
        <Button variant="contained" color="primary" onClick={handleSubmit}>
          Send
        </Button>
      </Box>
    </Box>
  );
}

export default ChatInterface;
