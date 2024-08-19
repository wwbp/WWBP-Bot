import React, { useState, useEffect, useRef } from "react";
import { createWebSocket } from "../utils/api";
import {
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  Avatar,
  MenuItem,
  Select,
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import { useSnackbar } from "notistack";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import botAvatar from "../assets/bot-avatar.png";
import EarIcon from "@mui/icons-material/Hearing";
import BrainIcon from "@mui/icons-material/Memory";
import MouthIcon from "@mui/icons-material/RecordVoiceOver";

function ChatInterface({ session, clearChat }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [chatMode, setChatMode] = useState("text");
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
  const tempMessageRef = useRef(""); // Temporary buffer for user's message
  const { enqueueSnackbar } = useSnackbar();
  const [chatState, setChatState] = useState("idle");
  const [dots, setDots] = useState("");


  const setupWebSocket = () => {
    if (ws.current) {
      ws.current.close();
    }

    ws.current = createWebSocket(session.id, chatMode === "audio");

    ws.current.onopen = () => {
      setIsWsConnected(true);
      if (chatMode === "audio") {
        setupPeerConnection();
      }
    };

    ws.current.onmessage = (event) => {
      if (event.data === '{"type":"ping"}') {
        return;
      }

      if (chatMode === "audio") {
        handleAudioMessage(event);
      } else {
        handleTextMessage(event);
      }
    };

    ws.current.onerror = (event) => {
      console.error("WebSocket error:", event);
      // Instead of using enqueueSnackbar, silently handle or log the error
      attemptReconnect();
    };

    ws.current.onclose = (event) => {
      console.log("WebSocket closed:", event);
      setIsWsConnected(false);
      attemptReconnect();
    };
  };

  const attemptReconnect = () => {
    if (ws.current.readyState !== WebSocket.OPEN) {
      setTimeout(() => {
        console.log("Attempting to reconnect WebSocket...");
        setupWebSocket();
      }, 5000);
    }
  };

  const handleTextMessage = (event) => {
    console.log("Handling text message:", event.data);
    const data = JSON.parse(event.data);
    if (data.event === "on_parser_start") {
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: "GritCoach", message: "", id: data.message_id },
      ]);
    } else if (data.event === "on_parser_stream") {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === data.message_id
            ? { ...msg, message: msg.message + data.value }
            : msg
        )
      );
    } else if (data.event === "on_parser_end") {
      setMessageId((prevId) => prevId + 1);
      setMessage(tempMessageRef.current); // Restore temporary buffer
    }
  };

  const handleAudioMessage = async (event) => {
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
          { sender: "You", message: data.transcript, id: data.message_id },
        ]);
        setMessageId((prevId) => prevId + 1);
        setMessage("");
      } else if (data.event === "on_parser_start") {
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: "GritCoach", message: "", id: data.message_id },
        ]);
      } else if (data.event === "on_parser_stream") {
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === data.message_id
              ? { ...msg, message: msg.message + data.value }
              : msg
          )
        );
      } else if (data.event === "on_parser_end") {
        setMessageId((prevId) => prevId + 1);
        setMessage(tempMessageRef.current); // Restore temporary buffer
      }
    }
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

  useEffect(()=>{
    if(chatState==="processing"){
      const interval = setInterval(()=>{
        setDots((prevDots)=>(prevDots.length<3?prevDots+".":""))
      },100);
      return ()=>clearInterval(interval);
    }else
    {
      setDots("");
    }
  },[chatState]);

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
  }, [session.id, chatMode]);

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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" && chatMode === "audio" && audioState === "idle") {
        e.preventDefault(); // Prevent default space behavior (like scrolling)
        handlePTTMouseDown();
      }
    };

    const handleKeyUp = (e) => {
      if (
        e.code === "Space" &&
        chatMode === "audio" &&
        audioState === "recording"
      ) {
        e.preventDefault(); // Prevent default space behavior
        handlePTTMouseUp();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [chatMode, audioState]);

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
    tempMessageRef.current = e.target.value; // Save user's message to temporary buffer
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) {
      enqueueSnackbar("Cannot send an empty message", { variant: "warning" });
      return;
    }

    const userMessageId = messageId;
    const userMessage = {
      sender: "You",
      message: message,
      id: userMessageId.toString(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    ws.current.send(
      JSON.stringify({ message: message, message_id: userMessageId + 1 })
    );
    setMessageId((prevId) => prevId + 1);
    setMessage("");
    tempMessageRef.current = ""; // Clear temporary buffer
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

  const handleModeChange = (event) => {
    setChatMode(event.target.value);
  };

  const getAudioStateIcon = () => {
    switch (audioState) {
      case "recording":
        return <EarIcon style={{ position: "absolute", top: "-30px" }} />;
      case "processing":
        return <BrainIcon style={{ position: "absolute", top: "-30px" }} />;
      case "speaking":
        return <MouthIcon style={{ position: "absolute", top: "-30px" }} />;
      default:
        return null;
    }
  };

  const getChatStateText = () =>{
    switch(chatState){
      case "idle":
        return "Type a message...";
      case "processing":
        return `${dots}`;
      case "speaking":
        return "Bot is Speaking"
      default:
        return "Type a message...";       
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      sx={{ width: "100%", height: "100%" }}
    >
      <Box
        display="flex"
        flexDirection="column"
        height="100%"
        width="100%"
        maxWidth="800px"
      >
        <Box display="flex" justifyContent="flex-end" p={2}>
          <Select
            value={chatMode}
            onChange={handleModeChange}
            variant="outlined"
            sx={{
              borderRadius: "50px",
              boxShadow: 3,
            }}
          >
            <MenuItem value="text">Text Mode</MenuItem>
            <MenuItem value="audio">Audio Mode</MenuItem>
          </Select>
        </Box>
        <Box
          flexGrow={1}
          overflow="auto"
          p={2}
          sx={{
            width: "100%",
            height: "500px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {messages.map((msg, index) => (
            <Box
              key={index}
              display="flex"
              justifyContent={
                msg.sender === "GritCoach" ? "flex-start" : "flex-end"
              }
              mb={2}
            >
              {msg.sender === "GritCoach" && (
                <Avatar
                  alt="Bot Avatar"
                  src={botAvatar}
                  style={{ marginRight: "8px" }}
                />
              )}
              <Box
                bgcolor={msg.sender === "GritCoach" ? "#f0f0f0" : "#cfe8fc"}
                p={2}
                borderRadius={2}
                maxWidth="60%"
                sx={{
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                  whiteSpace: "pre-wrap",
                  display: "inline-block",
                  maxWidth: "100%",
                  boxSizing: "border-box",
                  marginBottom: "8px",
                  padding: "16px", // Padding to ensure content stays inside
                  listStylePosition: "inside", // Ensures list markers are inside the padding
                }}
              >
                <Typography
                  variant="body2"
                  color="textSecondary"
                  sx={{
                    lineHeight: "1.2", // Further reduced line height for compact text
                    margin: "0", // Ensure no extra margin is applied to the Typography
                  }}
                >
                  <strong>{msg.sender}:</strong>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      ol: ({ children }) => (
                        <ol
                          style={{
                            paddingLeft: "20px", // Padding for list items
                            listStyleType: "decimal", // Ensure numbered lists are displayed correctly
                            listStylePosition: "inside", // Inside padding for markers
                            margin: "0", // No extra margin for list
                            lineHeight: "1.2", // Consistent line height for compactness
                          }}
                        >
                          {children}
                        </ol>
                      ),
                      ul: ({ children }) => (
                        <ul
                          style={{
                            paddingLeft: "20px", // Padding for list items
                            listStyleType: "disc", // Ensure bullets are displayed correctly
                            listStylePosition: "inside", // Inside padding for markers
                            margin: "0", // No extra margin for list
                            lineHeight: "1.2", // Consistent line height for compactness
                          }}
                        >
                          {children}
                        </ul>
                      ),
                      li: ({ children }) => (
                        <li style={{ marginBottom: "4px" }}>{children}</li>
                      ),
                    }}
                  >
                    {msg.message}
                  </ReactMarkdown>
                </Typography>
              </Box>
            </Box>
          ))}
          <div ref={messagesEndRef} />
        </Box>
        <Box display="flex" alignItems="center" p={2}>
          {chatMode === "audio" ? (
            <Box
              display="flex"
              justifyContent="center"
              flexGrow={1}
              position="relative"
            >
              <IconButton
                onMouseDown={handlePTTMouseDown}
                onMouseUp={handlePTTMouseUp}
                color={audioState === "recording" ? "secondary" : "default"}
                aria-label="push-to-talk"
                sx={{
                  width: 80,
                  height: 80,
                  fontSize: "2rem",
                  position: "relative", // Ensure the circular text is positioned correctly
                }}
              >
                <MicIcon sx={{ fontSize: "4rem" }} />
                {getAudioStateIcon()}
                <svg
                  width="120"
                  height="120"
                  viewBox="0 0 120 120"
                  style={{ position: "absolute", top: -50, left: -20 }}
                >
                  <path
                    id="circlePath"
                    d="M 60, 60
                       m -50, 0
                       a 50,50 0 1,1 100,0
                       a 50,50 0 1,1 -100,0"
                    fill="transparent"
                  />
                  <text fontSize="12" fill="#000">
                    <textPath
                      href="#circlePath"
                      startOffset="25%"
                      textAnchor="middle"
                      transform="rotate(180 60 60)"
                    >
                      hold to talk
                    </textPath>
                  </text>
                </svg>
              </IconButton>
            </Box>
          ) : (
            <>
              <TextField
                fullWidth
                value={message}
                onChange={handleInputChange}
                autoComplete="off"
                placeholder={getChatStateText()}

                onKeyDown={onKeyPress}
              />
              <Button
                onClick={handleSubmit}
                color="primary"
                variant="contained"
                style={{ marginLeft: "8px", height: "48px" }} // Ensure the buttons have the same height
              >
                Send
              </Button>
            </>
          )}
          {/* <Button
            onClick={handleCompleteTask}
            color="primary"
            variant="contained"
            style={{ marginLeft: "8px", height: "48px" }} // Ensure the buttons have the same height
          >
            Complete
          </Button> */}
        </Box>
      </Box>
    </Box>
  );
}

export default ChatInterface;
