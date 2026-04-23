import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const wid = localStorage.getItem("cdxi_workspace_id");
  if (wid) config.headers["X-Workspace-Id"] = wid;
  const token = localStorage.getItem("cdxi_token");
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  return config;
});

export default api;
export { API };
