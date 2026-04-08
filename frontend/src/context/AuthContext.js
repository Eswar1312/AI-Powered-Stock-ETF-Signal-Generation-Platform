import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../utils/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      api.get("/auth/me")
        .then((r) => setUser(r.data.user))
        .catch(() => { logout(); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const signin = async (email, password) => {
    const r = await api.post("/auth/signin", { email, password });
    const { token: t, user: u } = r.data;
    localStorage.setItem("token", t);
    api.defaults.headers.common["Authorization"] = `Bearer ${t}`;
    setToken(t);
    setUser(u);
    return u;
  };

  const signup = async (name, email, password) => {
    const r = await api.post("/auth/signup", { name, email, password });
    return r.data;
  };

  const verifySignupOtp = async (email, otp) => {
    const r = await api.post("/auth/verify-signup-otp", { email, otp });
    const { token: t, user: u } = r.data;
    localStorage.setItem("token", t);
    api.defaults.headers.common["Authorization"] = `Bearer ${t}`;
    setToken(t);
    setUser(u);
    return u;
  };

  const resendSignupOtp = async (email) => {
    const r = await api.post("/auth/resend-signup-otp", { email });
    return r.data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    delete api.defaults.headers.common["Authorization"];
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      signin,
      signup,
      verifySignupOtp,
      resendSignupOtp,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
