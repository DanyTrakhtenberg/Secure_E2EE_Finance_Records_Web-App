import { useState } from "react";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { clearSessionKey } from "./session/sessionKeyStore";

export function App() {
  // Key lives only in memory; on refresh it's gone, so we always start unauthenticated
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const handleLoggedIn = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    clearSessionKey();
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginPage onLoggedIn={handleLoggedIn} />;
  }

  return <DashboardPage onLogout={handleLogout} />;
}
