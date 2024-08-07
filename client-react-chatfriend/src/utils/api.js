import axios from "axios";

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

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Token ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

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

export async function getCSRFToken() {
  try {
    const response = await api.get("/csrf/");
    const csrfToken = response.data.csrfToken;
    document.cookie = `csrftoken=${csrfToken}; path=/`;
  } catch (error) {
    console.error("Error fetching CSRF token:", error);
  }
}

export async function fetchData(url = "") {
  try {
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}

export async function postData(url = "", body = {}) {
  try {
    const response = await api.post(url, body);
    return response.data;
  } catch (error) {
    console.error("Error posting data:", error);
    throw error;
  }
}

export async function putData(url = "", body = {}) {
  try {
    const response = await api.put(url, body);
    return response.data;
  } catch (error) {
    console.error("Error putting data:", error);
    throw error;
  }
}

export async function deleteData(url = "") {
  try {
    const response = await api.delete(url);
    return response.data;
  } catch (error) {
    console.error("Error deleting data:", error);
    throw error;
  }
}

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

export const createWebSocket = (sessionId, isAudioMode) => {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const wsUrl = process.env.REACT_APP_API_URL.replace(
    /^https?/,
    protocol
  ).replace("/api/v1", "");
  const endpoint = isAudioMode
    ? `/ws/audio/${sessionId}/`
    : `/ws/chat/${sessionId}/`;
  return new WebSocket(`${wsUrl}${endpoint}`);
};

export async function postFile(url = "", file) {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error posting file:", error);
    throw error;
  }
}

export async function downloadTranscript(moduleId, startDate, endDate) {
  try {
    const response = await api.get(
      `/download_transcript/${moduleId}/${startDate}/${endDate}/`,
      {
        responseType: "blob",
      }
    );
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `transcript_module_${moduleId}_${startDate}_to_${endDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
  } catch (error) {
    console.error("Error downloading transcript:", error);
    throw error;
  }
}

export default api;
