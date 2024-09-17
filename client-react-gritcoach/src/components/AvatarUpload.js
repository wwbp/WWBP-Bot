import React, { useState, useEffect } from "react";
import { IconButton, Avatar, Box, Typography } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteIcon from "@mui/icons-material/Delete";
import { getPresignedUrl, postFile, uploadToS3 } from "../utils/api"; // Use the same utils

const AvatarUpload = ({
  existingAvatar,
  onAvatarUploaded,
  onAvatarRemoved,
}) => {
  const [uploadedAvatar, setUploadedAvatar] = useState(existingAvatar);

  useEffect(() => {
    setUploadedAvatar(existingAvatar);
  }, [existingAvatar]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
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
      } else {
        // Handle production upload (e.g., S3)
        const { url, fields } = presignedData;
        await uploadToS3(url, fields, file);
        const fileUrl = `${url}${fields.key}`;
        setUploadedAvatar(fileUrl);
        onAvatarUploaded(fileUrl);
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Failed to upload avatar.");
    }
  };

  const handleRemoveAvatar = () => {
    setUploadedAvatar(null);
    onAvatarRemoved();
  };

  return (
    <Box>
      {/* Show existing avatar if present */}
      {uploadedAvatar ? (
        <Box mb={2} display="flex" flexDirection="column" alignItems="center">
          <Typography variant="subtitle1">Current Avatar</Typography>
          <Avatar
            src={uploadedAvatar}
            alt="Persona Avatar"
            sx={{ width: 100, height: 100, marginBottom: 2 }}
          />
          <IconButton color="secondary" onClick={handleRemoveAvatar}>
            <DeleteIcon />
          </IconButton>
        </Box>
      ) : (
        <Typography variant="subtitle1">No Avatar Uploaded</Typography>
      )}

      {/* Avatar Upload */}
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
    </Box>
  );
};

export default AvatarUpload;
