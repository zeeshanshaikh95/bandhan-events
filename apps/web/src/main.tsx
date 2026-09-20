import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import App from "@/App";
import QueryProvider from "@/providers/QueryProvider";
import { SettingsProvider } from "@/providers/SettingsProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import "@/styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <QueryProvider>
        <BrowserRouter>
          {/* Business settings are database-backed; the providers fall back to
              configuration defaults so a settings outage never blanks a page. */}
          <SettingsProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </SettingsProvider>
        </BrowserRouter>
      </QueryProvider>
    </HelmetProvider>
  </StrictMode>
);
