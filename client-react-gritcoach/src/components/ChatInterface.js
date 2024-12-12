import React, { useState, useEffect, useRef } from "react";
import { createWebSocket, fetchData } from "../utils/api";
import { Box } from "@mui/material";
import { useSnackbar } from "notistack";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import PushToTalkButton from "./PushToTalkButton";

function ChatInterface({ session, clearChat, persona }) {
  const botName = persona?.name || "GritCoach";
  const botAvatar = persona?.avatar_url;
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [chatMode, setChatMode] = useState("text");
  const [audioState, setAudioState] = useState("idle");
  const [audioQueue, setAudioQueue] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const ws = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const remoteStream = useRef(new MediaStream());
  const messagesEndRef = useRef(null);
  const { enqueueSnackbar } = useSnackbar();
  const audioBuffer = useRef([]);
  const [textBuffer, setTextBuffer] = useState([]);
  const textBufferRef = useRef([]);
  const [loading, setLoading] = useState(true);
  const [chatState, setChatState] = useState("idle");

  const setupWebSocket = () => {
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 2000;
    if (ws.current) {
      ws.current.close();
    }

    ws.current = createWebSocket(session.id, chatMode !== "text");

    ws.current.onopen = () => {
      if (chatMode === "audio") {
        setupPeerConnection();
      }
    };

    ws.current.onmessage = (event) => {
      if (event.data instanceof Blob) {
        // Handle audio blob directly
        setAudioQueue((prevQueue) => [...prevQueue, event.data]);
        return;
      }

      if (typeof event.data === "string") {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch (error) {
          console.error("Invalid JSON data:", error);
          return;
        }

        if (data.type === "ping") {
          ws.current.send(JSON.stringify({ type: "pong" }));
          return;
        }

        // Handle different chat modes
        switch (chatMode) {
          case "audio":
            if (data.sdp) {
              handleSDP(data);
            } else if (data.candidate) {
              handleICECandidate(data);
            } else if (data.transcript) {
              handleTranscript(data);
            } else if (data.event) {
              handleParserEvent(data);
            }
            break;

          case "text-then-audio":
            handleTextThenAudio(event);
            break;

          case "audio-then-text":
            handleAudioThenText(event);
            break;

          case "audio-only":
            handleAudioOnly(event);
            break;

          default:
            handleTextMessage(event);
            break;
        }
      } else {
        console.error("Unhandled WebSocket data type:", event.data);
      }
    };

    ws.current.onerror = (event) => {
      enqueueSnackbar("WebSocket error observed", { variant: "error" });
    };

    ws.current.onclose = (event) => {
      enqueueSnackbar("WebSocket connection closed", { variant: "info" });
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        enqueueSnackbar(
          `WebSocket disconnected. Reconnecting... (${reconnectAttempts}/${maxReconnectAttempts})`,
          {
            variant: "info",
          }
        );
        setTimeout(() => {
          connect();
        }, reconnectDelay);
      } else {
        enqueueSnackbar(
          "WebSocket connection failed. Please refresh the page.",
          {
            variant: "error",
          }
        );
      }
    };
  };

  useEffect(() => {
    const fetchMode = async () => {
      try {
        const response = await fetchData("/profile");
        setChatMode(response.interaction_mode);
      } catch (err) {
        console.log("Error fetching");
      } finally {
        setLoading(false);
      }
    };
    fetchMode();
  }, []);

  const handleSDP = async (data) => {
    try {
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(data.sdp)
      );
      if (data.sdp.type === "offer") {
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        ws.current.send(
          JSON.stringify({ sdp: peerConnection.current.localDescription })
        );
      }
    } catch (error) {
      enqueueSnackbar("Failed to handle SDP", { variant: "error" });
      console.error("SDP Error:", error);
    }
  };

  const handleICECandidate = async (data) => {
    try {
      await peerConnection.current.addIceCandidate(
        new RTCIceCandidate(data.candidate)
      );
    } catch (error) {
      enqueueSnackbar("Error adding ICE candidate", { variant: "error" });
      console.error("ICE Candidate Error:", error);
    }
  };

  const handleTranscript = (data) => {
    setMessages((prev) => [
      ...prev,
      { sender: "You", message: data.transcript, id: "temp-" + Date.now() },
    ]);
  };

  const handleParserEvent = (data) => {
    const updateMessage = (id, updateFn) =>
      setMessages((prev) =>
        prev.map((msg) => (msg.id === id ? updateFn(msg) : msg))
      );

    switch (data.event) {
      case "on_parser_start":
        setChatState("speaking");
        setMessages((prev) => [
          ...prev,
          { sender: botName, message: "", id: data.message_id },
        ]);
        break;
      case "on_parser_stream":
        updateMessage(data.message_id, (msg) => ({
          ...msg,
          message: msg.message + data.value,
        }));
        break;
      case "on_parser_end":
        setChatState("idle");
        break;
      default:
        console.warn("Unknown parser event:", data.event);
    }
  };

  const handleTextMessage = (event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch (error) {
      console.error("Invalid JSON data:", error);
      return;
    }

    if (data.type === "replace_user_message") {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === data.message_id ? { ...msg, message: data.message } : msg
        )
      );
    } else {
      handleParserEvent(data);
    }
  };

  const handleTextThenAudio = (data) => {
    if (data.event === "on_parser_end" && audioBuffer.current.length > 0) {
      const audioBlob = new Blob(audioBuffer.current, { type: "audio/webm" });
      setAudioQueue([audioBlob]);
      audioBuffer.current = [];
    }
    handleParserEvent(data);
  };

  const handleAudioOnly = (data) => {
    switch (data.event) {
      case "on_parser_start":
        textBufferRef.current = [];
        setTextBuffer((prevBuffer) => [
          ...prevBuffer,
          { sender: botName, message: "", id: data.message_id },
        ]);
        break;
      case "on_parser_stream":
        setTextBuffer((prevBuffer) =>
          prevBuffer.map((msg) =>
            msg.id === data.message_id
              ? { ...msg, message: msg.message + data.value }
              : msg
          )
        );
        break;
      case "on_parser_end":
        setMessages((prev) => [...prev, ...textBuffer]);
        setTextBuffer([]);
        break;
      default:
        handleParserEvent(data);
    }
  };

  const handleAudioThenText = (data) => {
    handleParserEvent(data);
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
    if (!loading) {
      setupWebSocket();
      setChatState("processing");
    }

    return () => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
      if (peerConnection.current) {
        peerConnection.current.close();
      }
    };
  }, [session.id, chatMode, loading]);

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
    if (!isPlaying && !audioQueue.length) {
      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages, ...textBufferRef.current];
        return updatedMessages;
      });
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

  const sendAudioMessage = (msg) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(msg.data);
    } else {
      enqueueSnackbar("WebSocket is not open", { variant: "error" });
    }
  };

  const sendTextMessage = (msg) => {
    setChatState("processing");

    const userMessage = {
      sender: "You",
      message: msg,
      id: "temp-" + Date.now(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ message: msg }));
    } else {
      enqueueSnackbar("WebSocket is not open", { variant: "error" });
      console.error("WebSocket is not open");
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
        <MessageList
          messages={messages}
          botName={botName}
          botAvatar={botAvatar}
          chatState={chatState}
        />
        <Box display="flex" alignItems="center" p={2}>
          {chatMode !== "text" ? (
            <PushToTalkButton
              audioState={audioState}
              setAudioState={setAudioState}
              sendMessage={sendAudioMessage}
              chatMode={chatMode}
            />
          ) : (
            <MessageInput
              message={message}
              setMessage={setMessage}
              sendMessage={sendTextMessage}
              chatState={chatState}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default ChatInterface;
