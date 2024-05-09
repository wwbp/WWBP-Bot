import React from "react";
import CurrentTime from "./CurrentTime";

function HomePage({ isLoggedIn }) {
  return (
    <div>
      <h1>Welcome to the Home</h1>
      {isLoggedIn && <CurrentTime />}
    </div>
  );
}

export default HomePage;
