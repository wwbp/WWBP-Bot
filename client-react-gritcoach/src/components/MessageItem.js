import React from "react";
import { Box, Typography } from "@mui/material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Avatar from "./Avatar";
import defaultUserPlaceholder from "../assets/user-placeholder.png";

const MessageItem = ({ message, botName, avatar }) => {
  const isBot = message.sender === botName;

  return (
    <Box
      display="flex"
      justifyContent={isBot ? "flex-start" : "flex-end"}
      mb={2}
    >
      {isBot ? (
        avatar && (
          <Avatar
            alt={`${botName} Avatar`}
            src={avatar}
            isBot={true}
            style={{ marginRight: "8px" }}
          />
        )
      ) : (
        <Avatar
          alt="User Avatar"
          src={defaultUserPlaceholder} // Use the placeholder for user messages
          isBot={false}
          style={{ marginLeft: "8px" }}
        />
      )}
      <Box
        bgcolor={isBot ? "#f0f0f0" : "#cfe8fc"}
        p={1}
        borderRadius={2}
        maxWidth="60%"
      >
        <Typography variant="body2" color="textSecondary">
          <strong>{message.sender}:</strong>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.message}
          </ReactMarkdown>
        </Typography>
      </Box>
    </Box>
  );
};

export default MessageItem;
