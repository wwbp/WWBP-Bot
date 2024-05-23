import axios from "axios";

// Helper function to get cookies by name
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Creating an Axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor to add token to each request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); // Get the token from localStorage
    if (token) {
      config.headers["Authorization"] = `Token ${token}`; // Append token to headers
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to add CSRF token to each request
api.interceptors.request.use(
  (config) => {
    const token = getCookie("csrftoken");
    if (token) {
      config.headers["X-CSRFToken"] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Function to fetch CSRF token and update cookie
export async function getCSRFToken() {
  try {
    const response = await api.get("/csrf/");
    const csrfToken = response.data.csrfToken;
    document.cookie = `csrftoken=${csrfToken}; path=/`;
  } catch (error) {
    console.error("Error fetching CSRF token:", error);
  }
}

// Function to fetch data using GET method
export async function fetchData(url = "") {
  try {
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}

// Function to send data using POST method
export async function postData(url = "", body = {}) {
  try {
    const response = await api.post(url, body);
    return response.data;
  } catch (error) {
    console.error("Error posting data:", error);
    throw error;
  }
}

// Function to send data using PUT method
export async function putData(url = "", body = {}) {
  try {
    const response = await api.put(url, body);
    return response.data;
  } catch (error) {
    console.error("Error putting data:", error);
    throw error;
  }
}

// Function to delete data using DELETE method
export async function deleteData(url = "") {
  try {
    const response = await api.delete(url);
    return response.data;
  } catch (error) {
    console.error("Error deleting data:", error);
    throw error;
  }
}

// Function to create a chat session
export async function createChatSession(moduleId, taskId) {
  try {
    const response = await postData("/chat_sessions/", {
      module: moduleId,
      task: taskId,
    });
    return response;
  } catch (error) {
    console.error("Error creating chat session:", error.message);
    throw error;
  }
}

// Function to send a chat message and receive a response
export async function sendMessage(sessionId, message, sender) {
  try {
    const response = await postData("/chat_messages/", {
      session: sessionId,
      message,
      sender,
    });
    return response;
  } catch (error) {
    console.error("Error sending message:", error.message);
    throw error;
  }
}

// Function to fetch chat messages for a session
export async function fetchChatMessages(sessionId) {
  try {
    const response = await fetchData(`/chat_sessions/${sessionId}/messages/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    throw error;
  }
}

export function createWebSocket(sessionId) {
  const wsUrl = process.env.REACT_APP_API_URL.replace("http", "ws").replace(
    "/api/v1",
    ""
  );
  return new WebSocket(`${wsUrl}/ws/chat/`);
}

export default api;
