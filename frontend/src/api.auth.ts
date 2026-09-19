import { http } from "./api.http";
import { setToken } from "./auth";

export interface AuthResponse {
  token: string;
  username: string;
  role: "admin" | "operator";
}

export const authApi = {
  login: async (username: string, password: string): Promise<AuthResponse> => {
    const res = await http<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setToken(res.token);
    return res;
  },

  signup: async (
    username: string,
    password: string,
    role: "admin" | "operator",
  ): Promise<AuthResponse> => {
    const res = await http<AuthResponse>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ username, password, role }),
    });
    setToken(res.token);
    return res;
  },

  me: () => http<{ username: string; role: string }>("/api/auth/me"),
  logout: () => setToken(null),
};