import React, { useState, useEffect } from "react";
import { fetchData } from "../utils/api";

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
  }, []);

  return (
    <div>
      <h1>Current Time</h1>
      <p>{time}</p>
    </div>
  );
}

export default CurrentTime;
