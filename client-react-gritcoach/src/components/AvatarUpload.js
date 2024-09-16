import React, { useState, useEffect } from "react";
import { IconButton, Avatar, Box } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { getPresignedUrl, postFile } from "../utils/api"; // Use the same utils

const AvatarUpload = ({ existingAvatar, onAvatarUploaded }) => {
  const [uploadedAvatar, setUploadedAvatar] = useState(existingAvatar);

  const handleFileChange = async (e) => {
    const file = e.target.files[0]; // Single file (avatar)
    if (!file) return;

    const fileName = file.name;
    const fileType = file.type;

    try {
      // Step 1: Get presigned URL (avatar-specific)
      const presignedData = await getPresignedUrl(fileName, fileType, true); // Ensure it's avatar-specific

      if (presignedData.url === "local") {
        // Handle local upload
        const formData = new FormData();
        formData.append("file", file);
        formData.append("is_avatar", true); 

        // Send to local upload URL
        const response = await postFile("/local_upload/", formData);
        const fileUrl = response.file_path; // Assuming the file path is returned

        setUploadedAvatar(fileUrl);
        onAvatarUploaded(fileUrl); // Notify parent about the new avatar URL
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Failed to upload avatar.");
    }
  };

  return (
    <Box>
      <input
        accept="image/*"
        style={{ display: "none" }}
        id="avatar-upload"
        type="file"
        onChange={handleFileChange}
      />
      <label htmlFor="avatar-upload">
        <IconButton component="span">
          <UploadFileIcon />
        </IconButton>
      </label>
      {uploadedAvatar && <Avatar alt="Avatar" src={uploadedAvatar} />}{" "}
      {/* Show avatar */}
    </Box>
  );
};

export default AvatarUpload;
