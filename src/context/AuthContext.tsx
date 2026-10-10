import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  authenticated: boolean;
  user: any | null;
  checkAuth: () => Promise<void>;
  setAuth: (user: any) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  authenticated: false,
  user: null,
  checkAuth: async () => {},
  setAuth: () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<any | null>(null);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/v1/admin/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAuthenticated(true);
          setUser(data.data.user);
        }
      } else {
        setAuthenticated(false);
        setUser(null);
      }
    } catch {
      setAuthenticated(false);
      setUser(null);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const logout = async () => {
    await fetch('/api/v1/admin/auth/logout', { method: 'POST' });
    setAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ authenticated, user, checkAuth, setAuth: (u) => { setAuthenticated(true); setUser(u); }, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
