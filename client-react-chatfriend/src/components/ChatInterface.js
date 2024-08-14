import React, { useState, useEffect, useRef } from "react";
import { createWebSocket, fetchData } from "../utils/api";
import {
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  Avatar,
  MenuItem,
  Select,
  Stack,
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import { useSnackbar } from "notistack";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import chatFriendAvatar from "../assets/chatFriend-avatar.png";
import EarIcon from "@mui/icons-material/Hearing";
import BrainIcon from "@mui/icons-material/Memory";
import MouthIcon from "@mui/icons-material/RecordVoiceOver";
import UploadedFile from "./UploadedFile";

function ChatInterface({ session, clearChat, selectedTask }) {
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
  const audioBuffer = useRef([]);
  const [textBuffer, setTextBuffer] = useState([]); // [{ sender: "ChatFriend", message: "", id: data.message_id }
  const textBufferRef = useRef([]);
  const [loading, setLoading] = useState(true);
  const [chatState, setChatState] = useState("idle");
  const [dots, setDots] = useState("");


  const setupWebSocket = () => {
    if (ws.current) {
      ws.current.close();
    }

    ws.current = createWebSocket(session.id, chatMode !== "text");

    ws.current.onopen = () => {
      console.log("WebSocket connected");
      setIsWsConnected(true);
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
      }
      else if (chatMode === "audio-then-text") {
        handleAudioThenText(event);
      }
      else if (chatMode === "audio-only") {
        handleAudioOnly(event);
      }
        else {
        handleTextMessage(event);
      }
    };

    ws.current.onerror = (event) => {
      console.error("WebSocket error:", event);
      // enqueueSnackbar("WebSocket error observed", { variant: "error" });
      setIsWsConnected(false);
    };

    ws.current.onclose = (event) => {
      console.log("WebSocket closed:", event);
      // enqueueSnackbar("WebSocket connection closed", { variant: "info" });
      setIsWsConnected(false);
    };
  };

  // useEffect(()=>{
  //   fileRef.current = selectedTask;
  // },[])

  useEffect(()=>{
    const fetchMode = async ()=>{
      try{
        const response = await fetchData('/profile')
        console.log("Interaction mode is ", response)
        setChatMode(response.interaction_mode)

      }catch (err)
      {
        console.log("Error fetching")
      }finally{
        setLoading(false);
      }
    };
    fetchMode();
  },[]);

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

  const handleTextMessage = (event) => {
    console.log("Handling text message:", event.data);
    const data = JSON.parse(event.data);
    setChatState("speaking");
    if (data.event === "on_parser_start") {
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: "ChatFriend", message: "", id: data.message_id },
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
      setChatState("idle");
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
        capitalizeTranscript(data);
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: "You", message: data.transcript, id: data.message_id },
        ]);
        setMessageId((prevId) => prevId + 1);
        setMessage("");
      } else if (data.event === "on_parser_start") {
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: "ChatFriend", message: "", id: data.message_id },
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

  const handleTextThenAudio = async (event) => {
    if (event.data instanceof Blob) {
      audioBuffer.current.push(event.data);
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
        capitalizeTranscript(data);
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: "You", message: data.transcript, id: data.message_id },
        ]);
        setMessageId((prevId) => prevId + 1);
        setMessage("");
      } else if (data.event === "on_parser_start") {
        textBufferRef.current = [];
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: "ChatFriend", message: "", id: data.message_id },
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
        if(audioBuffer.current.length > 0){
          const audioBlob = new Blob(audioBuffer.current, { type: "audio/webm" });
          setAudioQueue([audioBlob]);
          audioBuffer.current = [];
        }
      }
    }
  };

  
  const handleAudioOnly = async (event) => {
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
        // setMessages((prevMessages) => [
        //   ...prevMessages,
        //   { sender: "You", message: data.transcript, id: data.message_id },
        // ]);
        setMessageId((prevId) => prevId + 1);
        setMessage("");
      } else if (data.event === "on_parser_start") {
        textBufferRef.current = [];
        setTextBuffer((prevBuffer)=>[...prevBuffer, { sender: "ChatFriend", message: "", id: data.message_id }]);
        // setMessages((prevMessages) => [
        //   ...prevMessages,
        //   { sender: "ChatFriend", message: "", id: data.message_id },
        // ]);
      } else if (data.event === "on_parser_stream") {
        setTextBuffer((prevBuffer) => prevBuffer.map((msg)=>msg.id === data.message_id?
        { ...msg, message: msg.message + data.value}:msg) );
        // setMessages((prevMessages) =>
        //   prevMessages.map((msg) =>
        //     msg.id === data.message_id
        //       ? { ...msg, message: msg.message + data.value }
        //       : msg
        //   )
        // );
      } else if (data.event === "on_parser_end") {
        setMessageId((prevId) => prevId + 1);
        setMessages((prevMessages) => [...prevMessages, ...textBuffer]);
        setTextBuffer([]);
        setMessage(""); // Restore temporary buffer
      }
    }
  };

  const handleAudioThenText = async (event) => {
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
        capitalizeTranscript(data);
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: "You", message: data.transcript, id: data.message_id },
        ]);
        setMessageId((prevId) => prevId + 1);
        setMessage("");
      } else if (data.event === "on_parser_start") {
        textBufferRef.current = [];
        textBufferRef.current.push({ sender: "ChatFriend", message: "", id: data.message_id });
        // setMessages((prevMessages) => [
        //   ...prevMessages,
        //   { sender: "ChatFriend", message: "", id: data.message_id },
        // ]);
      } else if (data.event === "on_parser_stream") {
        textBufferRef.current = textBufferRef.current.map((msg) =>
        msg.id === data.message_id
          ? { ...msg, message: msg.message + data.value }
          : msg
      );
        // setMessages((prevMessages) =>
        //   prevMessages.map((msg) =>
        //     msg.id === data.message_id
        //       ? { ...msg, message: msg.message + data.value }
        //       : msg
        //   )
        // );
      } else if (data.event === "on_parser_end") {
        console.log("On parser end textBuffer is ", textBufferRef.current)
        console.log("On parser end messages is ", messages)
        setMessageId((prevId) => prevId + 1);
        // setMessages((prevMessages) => [...prevMessages, ...textBuffer]);
        // setTextBuffer([]);
        setMessage(""); // Restore temporary buffer
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
  }, [session.id, chatMode,loading]);

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
    if(!isPlaying && !audioQueue.length)
    {
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
    console.log("Selected task is ", selectedTask),
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
        {/* <Box display="flex" justifyContent="flex-end" p={2}>
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
            <MenuItem value="text-then-audio">Text then Audio Mode</MenuItem>
            <MenuItem value="audio-then-text">Audio Then Text Mode</MenuItem>
            <MenuItem value="audio-only">Audio Only</MenuItem>            
          </Select>
        </Box> */}
        {/* <Box

          overflow="hidden"
        > */}
        <Stack direction="row" spacing={2} height="100%">
          <Box
            flexGrow={1}
            overflow="auto"
            p={2}
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {messages.map((msg, index) => (
              <Box
                key={index}
                display="flex"
                justifyContent={
                  msg.sender === "ChatFriend" ? "flex-start" : "flex-end"
                }
                mb={2}
              >
                {msg.sender === "ChatFriend" && (
                  <Avatar
                    alt="ChatFriend Avatar"
                    src={chatFriendAvatar}
                    style={{ marginRight: "8px" }}
                  />
                )}
                <Box
                  bgcolor={msg.sender === "ChatFriend" ? "#f0f0f0" : "#cfe8fc"}
                  p={1}
                  borderRadius={2}
                  maxWidth="60%"
                >
                  <Typography variant="body2" color="textSecondary">
                    <strong>{msg.sender}:</strong>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.message}
                    </ReactMarkdown>
                  </Typography>
                </Box>
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </Box>
          {selectedTask.files?.length>0?
          <Box
            width={ "150%" } // Adjust this value to allocate space for the UploadedFile component
            height={ "100%" } 
            overflow="auto"
            p={2}
          >
              <UploadedFile files = {selectedTask} />
          </Box>:<></>}
        </Stack>  
        {/* </Box>   */}
        <Box display="flex" alignItems="center" p={2}>
          {chatMode !== "text" ? (
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

function capitalizeTranscript(data) {
  data.transcript = data.transcript[0].toUpperCase() + data.transcript.slice(1);
}
