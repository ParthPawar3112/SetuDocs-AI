// Shared Axios client that attaches the persisted JWT to protected API requests.
import axios from "axios";

const TOKEN_KEY = "govdocs_access_token";

const client = axios.create({
  baseURL: "http://127.0.0.1:8080/api",
  headers: { "Content-Type": "application/json" },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// The server stores and returns UTC, but SQLite hands datetimes back without a timezone
// marker ("2026-10-06T18:57:04"). `new Date()` would read that as LOCAL time and show every
// timestamp hours early (5h30m on an IST machine). Mark such strings as UTC. Date-only
// values ("2026-10-28") and strings that already carry an offset are left alone.
const NAIVE_UTC_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/;
function markUtc(value) {
  if (typeof value === "string") return NAIVE_UTC_DATETIME.test(value) ? `${value}Z` : value;
  if (Array.isArray(value)) return value.map(markUtc);
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, markUtc(item)]));
  }
  return value; // Blob, ArrayBuffer, numbers, null...
}
client.interceptors.response.use((response) => {
  response.data = markUtc(response.data);
  return response;
});

export { TOKEN_KEY };
export default client;
