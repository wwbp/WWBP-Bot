import React, { useState, useEffect } from "react";
import { fetchData } from "../utils/api";
import { Box, Typography } from "@mui/material";

function CurrentTime() {
  const [time, setTime] = useState("");
  const apiUrl = process.env.REACT_APP_API_URL;

  useEffect(() => {
    const fetchTime = async () => {
      try {
        const response = await fetchData(`${apiUrl}/time/`);
        setTime(response.current_time);
      } catch (error) {
        console.error("Error fetching time:", error);
      }
    };

    fetchTime();
  }, [apiUrl]);

  return (
    <Box textAlign="center" py={2}>
      <Typography variant="h5">Current Time</Typography>
      <Typography variant="h6">{time}</Typography>
    </Box>
  );
}

export default CurrentTime;
