import { createContext, useContext, useState, type ReactNode } from "react";
import { getCurrentUser, setToken, type AuthUser } from "./auth";

interface AuthCtx {
  user: AuthUser | null;
  login: (token: string) => void;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getCurrentUser());

  const login = (token: string) => {
    setToken(token);
    setUser(getCurrentUser());
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    window.location.href = "/login";
  };

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}