import React from "react";
import CurrentTime from "./CurrentTime";

function HomePage({ isLoggedIn }) {
  return (
    <div>
      <h1>Welcome to the Home</h1>
      {isLoggedIn ? <CurrentTime /> : <p>You are not logged in</p>}
    </div>
  );
}

export default HomePage;
