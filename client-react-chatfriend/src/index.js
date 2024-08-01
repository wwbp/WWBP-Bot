import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { getCSRFToken } from "./utils/api";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";

const theme = createTheme({
  palette: {
    primary: {
      main: "#581B98", // Red
    },
    secondary: {
      main: "#757575", // Gray
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));

getCSRFToken().then(() => {
  root.render(
    <React.StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </React.StrictMode>
  );
});

reportWebVitals();
