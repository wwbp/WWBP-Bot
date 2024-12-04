import React, { useRef, useEffect } from "react";
import { Box, IconButton } from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import EarIcon from "@mui/icons-material/Hearing";
import BrainIcon from "@mui/icons-material/Memory";
import MouthIcon from "@mui/icons-material/RecordVoiceOver";
import { useSnackbar } from "notistack";

function PushToTalkButton({
  audioState,
  setAudioState,
  ws,
  chatMode,
  messageId,
  setMessageId,
}) {
  const localStream = useRef(null);
  const mediaRecorderRef = useRef(null);
  const { enqueueSnackbar } = useSnackbar();

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
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ message_id: messageId }));
            ws.current.send(event.data);
          } else {
            enqueueSnackbar("WebSocket is not open", { variant: "error" });
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
        console.error("Error accessing media devices:", error);
      });
  };

  const handlePTTMouseUp = () => {
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setAudioState("processing");
    }
  };

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

  // Function to determine which icon to display based on audioState
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

  return (
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
          position: "relative",
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
  );
}

export default PushToTalkButton;
