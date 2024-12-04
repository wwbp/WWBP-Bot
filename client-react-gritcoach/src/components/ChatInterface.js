import React, { useState, useEffect, useRef } from "react";
import { createWebSocket, fetchData } from "../utils/api";
import { Box } from "@mui/material";
import { useSnackbar } from "notistack";
import defaultBotAvatar from "../assets/bot-avatar.png";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import PushToTalkButton from "./PushToTalkButton";

function ChatInterface({ session, clearChat, persona }) {
  const botName = persona?.name || "GritCoach";
  const convertAvatarUrl = (inputUrl) => {
    const s3Pattern = /^https:\/\/.*\.s3\.amazonaws\.com/;

    if (s3Pattern.test(inputUrl)) {
      const relativePath = inputUrl.replace(s3Pattern, "");
      return `${process.env.REACT_APP_API_URL.replace(
        "/api/v1",
        ""
      )}${relativePath}`;
    }

    return inputUrl;
  };

  const botAvatar = persona?.avatar_url
    ? convertAvatarUrl(persona.avatar_url)
    : defaultBotAvatar;

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [chatMode, setChatMode] = useState("text");
  const [audioState, setAudioState] = useState("idle");
  const [messageId, setMessageId] = useState(1);
  const [audioQueue, setAudioQueue] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const ws = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const remoteStream = useRef(new MediaStream());
  const mediaRecorderRef = useRef(null);
  const messagesEndRef = useRef(null);
  const tempMessageRef = useRef("");
  const { enqueueSnackbar } = useSnackbar();
  const audioBuffer = useRef([]);
  const [textBuffer, setTextBuffer] = useState([]);
  const textBufferRef = useRef([]);
  const [loading, setLoading] = useState(true);
  const [chatState, setChatState] = useState("idle");
  const [dots, setDots] = useState("");

  useEffect(() => {
    console.log("Persona data:", persona);
    console.log("Bot avatar URL:", botAvatar);
  }, [persona, botAvatar]);

  const setupWebSocket = () => {
    if (ws.current) {
      ws.current.close();
    }

    ws.current = createWebSocket(session.id, chatMode !== "text");

    ws.current.onopen = () => {
      console.log("WebSocket connected");
      if (chatMode === "audio") {
        setupPeerConnection();
      }
    };

    ws.current.onmessage = (event) => {
      if (event.data === '{"type":"ping"}') {
        return;
      }

      console.log("WebSocket message received:", event.data);

      if (chatMode === "audio") {
        handleAudioMessage(event);
      } else if (chatMode === "text-then-audio") {
        handleTextThenAudio(event);
      } else if (chatMode === "audio-then-text") {
        handleAudioThenText(event);
      } else if (chatMode === "audio-only") {
        handleAudioOnly(event);
      } else {
        handleTextMessage(event);
      }
    };

    ws.current.onerror = (event) => {
      console.error("WebSocket error:", event);
      enqueueSnackbar("WebSocket error observed", { variant: "error" });
    };

    ws.current.onclose = (event) => {
      console.log("WebSocket closed:", event);
      enqueueSnackbar("WebSocket connection closed", { variant: "info" });
    };
  };

  useEffect(() => {
    const fetchMode = async () => {
      try {
        const response = await fetchData("/profile");
        console.log("Interaction mode is ", response);
        setChatMode(response.interaction_mode);
      } catch (err) {
        console.log("Error fetching");
      } finally {
        setLoading(false);
      }
    };
    fetchMode();
  }, []);

  useEffect(() => {
    if (chatState === "processing") {
      const interval = setInterval(() => {
        setDots((prevDots) => (prevDots.length < 3 ? prevDots + "." : ""));
      }, 100);
      return () => clearInterval(interval);
    } else {
      setDots("");
    }
  }, [chatState]);

  // Utility function to handle SDP
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
      enqueueSnackbar("Failed to set remote description", { variant: "error" });
      console.error("Failed to set remote description:", error);
    }
  };

  // Utility function to handle ICE candidates
  const handleICECandidate = async (data) => {
    try {
      await peerConnection.current.addIceCandidate(
        new RTCIceCandidate(data.candidate)
      );
    } catch (error) {
      enqueueSnackbar("Error adding received ICE candidate", {
        variant: "error",
      });
      console.error("Error adding received ICE candidate:", error);
    }
  };

  // Utility function to handle transcripts
  const handleTranscript = (data) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: "You", message: data.transcript, id: data.message_id },
    ]);
    setMessageId((prevId) => prevId + 1);
    setMessage("");
  };

  // Utility function to handle parser events
  const handleParserEvent = (data) => {
    switch (data.event) {
      case "on_parser_start":
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: botName, message: "", id: data.message_id },
        ]);
        break;
      case "on_parser_stream":
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === data.message_id
              ? { ...msg, message: msg.message + data.value }
              : msg
          )
        );
        break;
      case "on_parser_end":
        setMessageId((prevId) => prevId + 1);
        setMessage(tempMessageRef.current);
        setChatState("idle");
        break;
      default:
        break;
    }
  };

  const handleTextMessage = (event) => {
    console.log("Handling text message:", event.data);

    let data;
    try {
      data = JSON.parse(event.data);
    } catch (error) {
      console.error("Invalid JSON data:", error);
      return;
    }

    setChatState("speaking");

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

  const handleAudioMessage = async (event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch (error) {
      console.error("Invalid JSON data:", error);
      return;
    }

    if (event.data instanceof Blob) {
      setAudioQueue((prevQueue) => [...prevQueue, event.data]);
    } else if (typeof event.data === "string") {
      if (data.sdp) {
        await handleSDP(data);
      } else if (data.candidate) {
        await handleICECandidate(data);
      } else if (data.transcript) {
        handleTranscript(data);
      } else if (data.event) {
        handleParserEvent(data);
      }
    }
  };

  const handleTextThenAudio = async (event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch (error) {
      console.error("Invalid JSON data:", error);
      return;
    }

    if (event.data instanceof Blob) {
      audioBuffer.current.push(event.data);
    } else if (typeof event.data === "string") {
      if (data.sdp) {
        await handleSDP(data);
      } else if (data.candidate) {
        await handleICECandidate(data);
      } else if (data.transcript) {
        handleTranscript(data);
      } else if (data.event) {
        if (data.event === "on_parser_end" && audioBuffer.current.length > 0) {
          const audioBlob = new Blob(audioBuffer.current, {
            type: "audio/webm",
          });
          setAudioQueue([audioBlob]);
          audioBuffer.current = [];
        }
        handleParserEvent(data);
      }
    }
  };

  const handleAudioOnly = async (event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch (error) {
      console.error("Invalid JSON data:", error);
      return;
    }

    if (event.data instanceof Blob) {
      setAudioQueue((prevQueue) => [...prevQueue, event.data]);
    } else if (typeof event.data === "string") {
      if (data.sdp) {
        await handleSDP(data);
      } else if (data.candidate) {
        await handleICECandidate(data);
      } else if (data.transcript) {
        setMessageId((prevId) => prevId + 1);
        setMessage("");
      } else if (data.event) {
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
            setMessageId((prevId) => prevId + 1);
            setMessages((prevMessages) => [...prevMessages, ...textBuffer]);
            setTextBuffer([]);
            setMessage("");
            break;
          default:
            break;
        }
      }
    }
  };

  const handleAudioThenText = async (event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch (error) {
      console.error("Invalid JSON data:", error);
      return;
    }

    if (event.data instanceof Blob) {
      setAudioQueue((prevQueue) => [...prevQueue, event.data]);
    } else if (typeof event.data === "string") {
      if (data.sdp) {
        await handleSDP(data);
      } else if (data.candidate) {
        await handleICECandidate(data);
      } else if (data.transcript) {
        handleTranscript(data);
      } else if (data.event) {
        handleParserEvent(data);
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
        console.log("Updated messages:", updatedMessages);
        return updatedMessages;
      });
    }
  }, [audioQueue, isPlaying]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" && chatMode === "audio" && audioState === "idle") {
        e.preventDefault();
        handlePTTMouseDown();
      }
    };

    const handleKeyUp = (e) => {
      if (
        e.code === "Space" &&
        chatMode === "audio" &&
        audioState === "recording"
      ) {
        e.preventDefault();
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

  const handleSendMessage = (msg) => {
    if (!msg.trim()) {
      enqueueSnackbar("Cannot send an empty message", { variant: "warning" });
      return;
    }

    const userMessageId = messageId;
    const userMessage = {
      sender: "You",
      message: msg,
      id: userMessageId.toString(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({ message: msg, message_id: userMessageId + 1 })
      );
    } else {
      enqueueSnackbar("WebSocket is not open", { variant: "error" });
      console.error("WebSocket is not open");
    }

    setMessageId((prevId) => prevId + 1);
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
        />
        <Box display="flex" alignItems="center" p={2}>
          {chatMode !== "text" ? (
            <PushToTalkButton
              audioState={audioState}
              handlePTTMouseDown={handlePTTMouseDown}
              handlePTTMouseUp={handlePTTMouseUp}
            />
          ) : (
            <MessageInput
              message={message}
              setMessage={setMessage}
              onSendMessage={handleSendMessage}
              chatState={chatState}
              dots={dots}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default ChatInterface;
