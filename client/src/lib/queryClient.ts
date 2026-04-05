import { QueryClient } from "@tanstack/react-query";

// VITE_API_URL is set at build time when deploying to Railway.
// Falls back to __PORT_5000__ (Perplexity proxy token) or empty string for local dev.
declare const __PORT_5000__: string;
const _proxy = typeof __PORT_5000__ !== "undefined" ? __PORT_5000__ : "";
const API_BASE: string = (import.meta.env.VITE_API_URL as string) || _proxy;

export async function apiRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<Response> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  return res;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const [path] = queryKey as string[];
        const res = await apiRequest("GET", path);
        if (!res.ok) {
          if (res.status === 401) throw new Error("UNAUTHORIZED");
          throw new Error(`${res.status}: ${res.statusText}`);
        }
        return res.json();
      },
      staleTime: 30_000,
      retry: false,
    },
  },
});
