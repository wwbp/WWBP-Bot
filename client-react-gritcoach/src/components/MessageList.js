import React, { useEffect, useRef } from "react";
import { Box, Typography } from "@mui/material";
import MessageItem from "./MessageItem";

function MessageList({ messages, botName, botAvatar, chatState }) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatState]);

  return (
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
      {messages.map((msg) => (
        <MessageItem
          key={msg.id}
          message={msg}
          botName={botName}
          avatar={msg.sender === botName ? botAvatar : null}
        />
      ))}
      {chatState === "processing" && (
        <Typography
          sx={{ color: "gray", fontStyle: "italic", textAlign: "left", mt: 1 }}
        >
          {botName} is thinking...
        </Typography>
      )}
      <div ref={messagesEndRef} />
    </Box>
  );
}

export default MessageList;
