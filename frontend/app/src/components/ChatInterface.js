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
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import { useSnackbar } from "notistack";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function ChatInterface({ session, clearChat }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [isAudioMode, setIsAudioMode] = useState(false);
  const [audioState, setAudioState] = useState("idle");
  const [messageId, setMessageId] = useState(1);
  const [audioQueue, setAudioQueue] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const ws = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const remoteStream = useRef(new MediaStream());
  const mediaRecorderRef = useRef(null);
  const messagesEndRef = useRef(null);
  const { enqueueSnackbar } = useSnackbar();

  const setupWebSocket = () => {
    if (ws.current) {
      ws.current.close();
    }

    ws.current = createWebSocket(session.id, isAudioMode);

    ws.current.onopen = () => {
      setIsWsConnected(true);
      setupPeerConnection();
    };

    ws.current.onmessage = async (event) => {
      if (event.data === '{"type":"ping"}') {
        return;
      }

      if (isAudioMode) {
        if (event.data instanceof Blob) {
          setAudioQueue((prevQueue) => [...prevQueue, event.data]);
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
              enqueueSnackbar("Failed to set remote description", {
                variant: "error",
              });
              console.error("Failed to set remote description:", error);
            }
          } else if (data.candidate) {
            try {
              await peerConnection.current.addIceCandidate(
                new RTCIceCandidate(data.candidate)
              );
            } catch (error) {
              enqueueSnackbar("Error adding received ICE candidate", {
                variant: "error",
              });
              console.error("Error adding received ICE candidate", error);
            }
          } else if (data.transcript) {
            setMessages((prevMessages) => [
              ...prevMessages,
              { sender: `You`, message: data.transcript, id: data.message_id },
            ]);
            setMessageId((prevId) => prevId + 1);
            setMessage("");
          } else if (data.event === "on_parser_start") {
            setMessages((prevMessages) => [
              ...prevMessages,
              { sender: `GritCoach`, message: "", id: data.message_id },
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
      } else {
        const data = JSON.parse(event.data);

        if (data.event === "on_parser_start") {
          setAudioState("speaking");
          setMessages((prevMessages) => [
            ...prevMessages,
            { sender: `GritCoach`, message: "", id: data.message_id },
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
          setAudioState("idle");
          setMessageId((prevId) => prevId + 1);
          setMessage("");
        }
      }
    };

    ws.current.onerror = (event) => {
      enqueueSnackbar("WebSocket error observed", { variant: "error" });
      console.error("WebSocket error observed:", event);
    };

    ws.current.onclose = (event) => {
      setIsWsConnected(false);
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
    };

    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, localStream.current);
      });
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
    if (clearChat) {
      setMessages([]);
    }
  }, [clearChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isPlaying && audioQueue.length > 0) {
      playNextAudio();
    }
  }, [audioQueue, isPlaying]);

  const playNextAudio = () => {
    if (audioQueue.length > 0) {
      setIsPlaying(true);
      setAudioState("speaking");
      const nextAudioBlob = audioQueue[0];
      const audioUrl = URL.createObjectURL(nextAudioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setIsPlaying(false);
        setAudioState("idle");
        setAudioQueue((prevQueue) => prevQueue.slice(1));
      };

      audio.play().catch((error) => {
        enqueueSnackbar("Error playing audio", { variant: "error" });
        console.error("Error playing audio:", error);
        setIsPlaying(false);
        setAudioState("idle");
        setAudioQueue((prevQueue) => prevQueue.slice(1));
      });
    }
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const userMessageId = messageId;
    const userMessage = {
      sender: `You`,
      message: message,
      id: userMessageId.toString(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    ws.current.send(
      JSON.stringify({ message: message, message_id: userMessageId + 1 })
    );
    setMessageId((prevId) => prevId + 1);
    setMessage("");
  };

  const onKeyPress = (e) => {
    if (e.keyCode === 13) {
      handleSubmit(e);
    }
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
            ws.current.send(JSON.stringify({ message_id: currentMessageId }));
            ws.current.send(event.data);
          } else {
            enqueueSnackbar("WebSocket is not open", { variant: "error" });
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
        enqueueSnackbar("Error accessing media devices.", { variant: "error" });
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
        <Box display="flex" alignItems="center">
          {!isAudioMode && <Typography variant="body2">Text Mode</Typography>}
          <Switch checked={isAudioMode} onChange={handleModeSwitch} />
          {isAudioMode && (
            <Typography variant="body2" style={{ marginLeft: "8px" }}>
              Audio Mode
            </Typography>
          )}
        </Box>
        <Typography
          variant="body2"
          color={isWsConnected ? "green" : "red"}
          style={{ marginLeft: "auto" }}
        >
          {isWsConnected ? "Connected" : "Disconnected"}
        </Typography>
      </Box>
      <Box flexGrow={1} overflow="auto" p={2} height="400px">
        {messages.map((msg, index) => (
          <Box key={index} mb={2}>
            <Typography variant="body2" color="textSecondary">
              <strong>{msg.sender}:</strong>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {msg.message}
              </ReactMarkdown>
            </Typography>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Box>
      <Box display="flex" justifyContent="center" alignItems="center" p={2}>
        {isAudioMode ? (
          <IconButton
            onMouseDown={handlePTTMouseDown}
            onMouseUp={handlePTTMouseUp}
            color={audioState === "recording" ? "secondary" : "default"}
            aria-label="push-to-talk"
            style={{ fontSize: "2rem" }}
          >
            <MicIcon style={{ fontSize: "3rem" }} />
          </IconButton>
        ) : (
          <>
            <TextField
              fullWidth
              value={message}
              onChange={handleInputChange}
              placeholder="Type a message..."
              onKeyDown={onKeyPress}
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
