// client-react-gritcoach/src/components/MessageInput.js
import React, { useEffect, useRef } from "react";
import { TextField, Button } from "@mui/material";
import { useSnackbar } from "notistack";

function MessageInput({ message, setMessage, sendMessage, chatState }) {
  const { enqueueSnackbar } = useSnackbar();
  const inputRef = useRef(null); 
  
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [chatState]);

  // Handle input field changes
  const handleInputChange = (e) => {
    setMessage(e.target.value);
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) {
      enqueueSnackbar("Cannot send an empty message", { variant: "warning" });
      return;
    }
    sendMessage(message);
    setMessage("");
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Handle Enter key press
  const onKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", width: "100%" }}>
      <TextField
        fullWidth
        value={message}
        onChange={handleInputChange}
        onKeyDown={onKeyPress}
        autoComplete="off"
        disabled={chatState === "processing"}
        multiline={false}
        inputRef={inputRef}
      />
      <Button
        type="submit"
        color="primary"
        variant="contained"
        style={{ marginLeft: "8px", height: "48px" }}
      >
        Send
      </Button>
    </form>
  );
}

export default MessageInput;
