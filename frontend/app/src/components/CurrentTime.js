import React, { useState, useEffect } from "react";
import axios from "axios";

function CurrentTime() {
  const [time, setTime] = useState("");
  const apiUrl = process.env.REACT_APP_API_URL;
  console.log(`@@@@url: ${apiUrl}`);
  useEffect(() => {
    const fetchTime = async () => {
      try {
        const response = await axios.get(`${apiUrl}/time/`);
        setTime(response.data.current_time);
      } catch (error) {
        console.error("Error fetching time:", error);
      }
    };

    fetchTime();
  }, []);

  return (
    <div>
      <h1>Current Time</h1>
      <p>{time}</p>
    </div>
  );
}

export default CurrentTime;
