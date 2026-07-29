import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext";
import "./styles/global.css";
import estateHubIcon from "./assets/branding/estatehub-icon.png";

const faviconLink = document.querySelector("link[rel='icon']");

if (faviconLink) {
  faviconLink.setAttribute("href", estateHubIcon);
  faviconLink.setAttribute("type", "image/png");
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
