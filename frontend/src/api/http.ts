import axios from "axios";

export const http = axios.create({
  baseURL: "http://localhost:8000",
  timeout: 10000,
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});