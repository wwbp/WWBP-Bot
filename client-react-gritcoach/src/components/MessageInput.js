import React from "react";
import { TextField, Button } from "@mui/material";
import { useSnackbar } from "notistack";

function MessageInput({
  message,
  setMessage,
  onSendMessage,
  chatState,
  dots,
}) {
  const { enqueueSnackbar } = useSnackbar();

  // Function to determine placeholder text based on chat state
  const getChatStateText = () => {
    switch (chatState) {
      case "idle":
        return "Type a message...";
      case "processing":
        return `${dots}`;
      case "speaking":
        return "GritCoach is typing...";
      default:
        return "Type a message...";
    }
  };

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
    onSendMessage(message);
    setMessage("");
  };

  // Handle Enter key press
  const onKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      handleSubmit(e);
    }
  };

  return (
    <>
      <TextField
        fullWidth
        value={message}
        onChange={handleInputChange}
        placeholder={getChatStateText()}
        onKeyDown={onKeyPress}
        autoComplete="off"
        disabled={chatState === "processing"}
        multiline={false}
      />
      <Button
        onClick={handleSubmit}
        color="primary"
        variant="contained"
        style={{ marginLeft: "8px", height: "48px" }} // Ensure the button has the same height
      >
        Send
      </Button>
    </>
  );
}

export default MessageInput;
