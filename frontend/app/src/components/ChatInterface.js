import React, { useState, useEffect, useRef } from "react";
import { createWebSocket } from "../utils/api";
import {
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  Switch,
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";

function ChatInterface({ session }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(null);
  const [isAudioMode, setIsAudioMode] = useState(false);
  const [audioState, setAudioState] = useState("idle");
  const ws = useRef(null);
  const messagesEndRef = useRef(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 5;
  let mediaRecorder = null;
  let ongoingStream = useRef(null);

  const setupWebSocket = () => {
    if (ws.current) {
      ws.current.close();
    }

    ws.current = createWebSocket(session.id, isAudioMode);

    ws.current.onopen = () => {
      console.log("WebSocket connected!");
      setReconnectAttempts(0);
    };

    ws.current.onmessage = async (event) => {
      if (event.data === '{"type":"ping"}') {
        console.log("Ping received from server");
        return; // Ignore ping messages
      }

      if (isAudioMode) {
        const audioBlob = new Blob([event.data], { type: "audio/wav" });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        await audio.play();
      } else {
        const data = JSON.parse(event.data);

        if (data.event === "on_parser_start") {
          ongoingStream.current = { id: data.run_id, content: "" };
          setMessages((prevMessages) => [
            ...prevMessages,
            { sender: "Assistant", message: "", id: data.run_id },
          ]);
          setAudioState("processing");
        } else if (
          data.event === "on_parser_stream" &&
          ongoingStream.current &&
          data.run_id === ongoingStream.current.id
        ) {
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === data.run_id
                ? { ...msg, message: msg.message + data.data.chunk }
                : msg
            )
          );
          setAudioState("speaking");
        } else if (data.event === "message") {
          setMessages((prevMessages) => [
            ...prevMessages,
            { sender: "Assistant", message: data.message },
          ]);
          setAudioState("idle");
        }
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
  }, [session.id, isAudioMode]);

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

  const handlePTTMouseDown = () => {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.start();

        const audioChunks = [];
        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
          ws.current.send(audioBlob);
          setAudioState("processing");
          stream.getTracks().forEach((track) => track.stop());
        };

        setAudioState("recording");
      })
      .catch((error) => {
        console.error("Error accessing media devices.", error);
      });
  };

  const handlePTTMouseUp = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setAudioState("processing");
    }
  };

  const handleModeSwitch = (event) => {
    setIsAudioMode(event.target.checked);
  };

  const getAudioStateColor = () => {
    switch (audioState) {
      case "recording":
        return "red";
      case "processing":
        return "yellow";
      case "speaking":
        return "green";
      default:
        return "gray";
    }
  };

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <Box display="flex" justifyContent="space-between" p={2}>
        <Typography variant="h6">Chat Interface</Typography>
        <Switch checked={isAudioMode} onChange={handleModeSwitch} />
        <Typography variant="body2">Audio Mode</Typography>
      </Box>
      <Box flexGrow={1} overflow="auto" p={2}>
        {messages.map((msg, index) => (
          <Box key={index} mb={2}>
            <Typography variant="body2" color="textSecondary">
              <strong>{msg.sender}:</strong> {msg.message}
            </Typography>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Box>
      <Box display="flex" p={2}>
        {isAudioMode ? (
          <IconButton
            onMouseDown={handlePTTMouseDown}
            onMouseUp={handlePTTMouseUp}
            color={audioState === "recording" ? "secondary" : "default"}
            aria-label="push-to-talk"
          >
            {audioState === "recording" ? <MicIcon /> : <MicOffIcon />}
          </IconButton>
        ) : (
          <>
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
          </>
        )}
      </Box>
      {isAudioMode && (
        <Box display="flex" justifyContent="center" alignItems="center" p={2}>
          <FiberManualRecordIcon style={{ color: getAudioStateColor() }} />
          <Typography variant="body2" style={{ marginLeft: "10px" }}>
            {audioState.charAt(0).toUpperCase() + audioState.slice(1)}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default ChatInterface;
