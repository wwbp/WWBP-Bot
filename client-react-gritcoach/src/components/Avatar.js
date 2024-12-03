import React from "react";
import MuiAvatar from "@mui/material/Avatar";
import defaultBotAvatar from "../assets/bot-avatar.png";
import defaultUserPlaceholder from "../assets/user-placeholder.png"; // Add a placeholder image

const Avatar = ({ src, alt, isBot }) => {
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

  let avatarSrc;
  if (isBot) {
    avatarSrc = src ? convertAvatarUrl(src) : defaultBotAvatar;
  } else {
    avatarSrc = src ? convertAvatarUrl(src) : defaultUserPlaceholder;
  }

  return <MuiAvatar alt={alt} src={avatarSrc} />;
};

export default Avatar;
