import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchLoggedInUser = async () => {
    try {
      const response = await api.get("/api/auth/me");
      setUser(response.data.data);
      return response.data;
    } catch (error) {
      setUser(null);
      localStorage.removeItem("token");
      throw error;
    }
  };

  const login = async (email, password) => {
    const response = await api.post("/api/auth/login", { email, password });
    const token = response.data.token;

    if (token) {
      localStorage.setItem("token", token);
      await fetchLoggedInUser();
    }

    return response.data;
  };

  const register = async (userData) => {
    const response = await api.post("/api/auth/register", userData);
    const token = response.data.token;

    if (token) {
      localStorage.setItem("token", token);
      await fetchLoggedInUser();
    }

    return response.data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        await fetchLoggedInUser();
      } catch (error) {
        localStorage.removeItem("token");
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        fetchLoggedInUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

const useAuth = () => useContext(AuthContext);

export { AuthProvider, useAuth };
