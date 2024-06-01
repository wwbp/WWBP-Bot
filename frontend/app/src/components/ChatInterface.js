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
  const [isAudioMode, setIsAudioMode] = useState(false);
  const [audioState, setAudioState] = useState("idle");
  const [messageId, setMessageId] = useState(1); // Initialize messageId
  const ws = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const remoteStream = useRef(new MediaStream());
  const mediaRecorderRef = useRef(null);
  const messagesEndRef = useRef(null);

  const setupWebSocket = () => {
    if (ws.current) {
      ws.current.close();
    }

    ws.current = createWebSocket(session.id, isAudioMode);

    ws.current.onopen = () => {
      // console.log("WebSocket connected!");
      setupPeerConnection();
    };

    ws.current.onmessage = async (event) => {
      // console.log("WebSocket message type:", typeof event.data);

      if (event.data === '{"type":"ping"}') {
        // console.log("Ping received from server");
        return;
      }

      if (isAudioMode) {
        if (event.data instanceof Blob) {
          const audioUrl = URL.createObjectURL(event.data);
          const audio = new Audio(audioUrl);
          audio
            .play()
            .then(() => {
              // console.log("Audio played successfully");
            })
            .catch((error) => {
              console.error("Error playing audio:", error);
            });
        } else if (typeof event.data === "string") {
          const data = JSON.parse(event.data);
          if (data.sdp) {
            try {
              await peerConnection.current.setRemoteDescription(
                new RTCSessionDescription(data.sdp)
              );
              if (data.sdp.type === "offer") {
                const answer = await peerConnection.current.createAnswer();
                await peerConnection.current.setLocalDescription(answer);
                ws.current.send(
                  JSON.stringify({
                    sdp: peerConnection.current.localDescription,
                  })
                );
              }
            } catch (error) {
              console.error("Failed to set remote description:", error);
            }
          } else if (data.candidate) {
            try {
              await peerConnection.current.addIceCandidate(
                new RTCIceCandidate(data.candidate)
              );
            } catch (error) {
              console.error("Error adding received ICE candidate", error);
            }
          } else if (data.transcript) {
            // console.log(`User Message ID: ${userMessageId}`);
            setMessages((prevMessages) => [
              ...prevMessages,
              {
                sender: `User (audio) (${data.message_id})`,
                message: data.transcript,
                id: data.message_id,
              },
            ]);
            setMessageId((prevId) => prevId + 1);
            setMessage("");
          } else if (data.event === "on_parser_start") {
            setMessages((prevMessages) => [
              ...prevMessages,
              {
                sender: `Assistant (audio) (${data.message_id})`,
                message: "",
                id: data.message_id,
              },
            ]);
          } else if (data.event === "on_parser_stream") {
            // console.log(`Assistant Message ID: ${data.data.message_id}`);
            setMessages((prevMessages) =>
              prevMessages.map((msg) =>
                msg.id === data.message_id
                  ? { ...msg, message: msg.message + data.data.chunk }
                  : msg
              )
            );
          } else if (data.event === "on_parser_end") {
            setMessageId((prevId) => prevId + 1);
            setMessage("");
          }
        }
      } else {
        const data = JSON.parse(event.data);

        if (data.event === "on_parser_start") {
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              sender: `Assistant (text) (${data.message_id})`,
              message: "",
              id: data.message_id,
            },
          ]);
        } else if (data.event === "on_parser_stream") {
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === data.message_id
                ? { ...msg, message: msg.message + data.data.chunk }
                : msg
            )
          );
        } else if (data.event === "on_parser_end") {
          setMessageId((prevId) => prevId + 1);
          setMessage("");
        }
      }
    };

    ws.current.onerror = (event) => {
      console.error("WebSocket error observed:", event);
    };

    ws.current.onclose = (event) => {
      // console.log(
      //   `WebSocket is closed now. Code: ${event.code}, Reason: ${event.reason}`
      // );
    };
  };

  const setupPeerConnection = () => {
    peerConnection.current = new RTCPeerConnection();

    peerConnection.current.onicecandidate = ({ candidate }) => {
      if (candidate) {
        ws.current.send(JSON.stringify({ candidate }));
      }
    };

    peerConnection.current.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.current.addTrack(track);
      });
      // console.log("Received remote track");
    };

    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, localStream.current);
      });
      // console.log("Added local tracks to peer connection");
    }
  };

  useEffect(() => {
    setupWebSocket();

    return () => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
      if (peerConnection.current) {
        peerConnection.current.close();
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
    const userMessageId = messageId;
    // console.log(`User Message ID (Text): ${userMessageId}`);
    const userMessage = {
      sender: `User (text) (${userMessageId})`,
      message: message,
      id: userMessageId.toString(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    ws.current.send(
      JSON.stringify({ message: message, message_id: userMessageId + 1 })
    );
    setMessageId((prevId) => prevId + 1); // Increment messageId
    setMessage("");
  };

  const handlePTTMouseDown = () => {
    navigator.mediaDevices
      .getUserMedia({ audio: { sampleRate: 48000, channelCount: 1 } })
      .then((stream) => {
        localStream.current = stream;
        mediaRecorderRef.current = new MediaRecorder(stream, {
          mimeType: "audio/webm;codecs=opus",
        });
        mediaRecorderRef.current.start();

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (ws.current.readyState === WebSocket.OPEN) {
            const currentMessageId = messageId;
            ws.current.send(JSON.stringify({ message_id: currentMessageId })); // Send messageId before audio data
            // console.log(`User Message ID (Audio): ${currentMessageId}`);
            ws.current.send(event.data);
          } else {
            console.error("WebSocket is not open");
          }
        };

        mediaRecorderRef.current.onstop = () => {
          stream.getTracks().forEach((track) => track.stop());
          setAudioState("idle");
        };

        setAudioState("recording");
      })
      .catch((error) => {
        console.error("Error accessing media devices.", error);
      });
  };

  const handlePTTMouseUp = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      setAudioState("processing");
      // setMessageId((prevId) => prevId + 1); // Increment messageId after sending audio data
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
              placeholder="Type a message..."
            />
            <Button onClick={handleSubmit} color="primary" variant="contained">
              Send
            </Button>
          </>
        )}
        <IconButton>
          <FiberManualRecordIcon style={{ color: getAudioStateColor() }} />
        </IconButton>
      </Box>
    </Box>
  );
}

export default ChatInterface;
