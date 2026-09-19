const TOKEN_KEY = "parking-token";

export interface AuthUser {
  username: string;
  role: "admin" | "operator";
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function parseToken(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return { username: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

export function getCurrentUser(): AuthUser | null {
  const t = getToken();
  return t ? parseToken(t) : null;
}