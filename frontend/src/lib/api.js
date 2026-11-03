import axios from "axios";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("cs_admin_token")}` });

export function formatApiError(detail) {
  if (detail == null) return "Etwas ist schiefgelaufen. Bitte erneut versuchen.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((e) => e?.msg || JSON.stringify(e)).join(" ");
  return detail.msg || String(detail);
}

export const api = axios;
