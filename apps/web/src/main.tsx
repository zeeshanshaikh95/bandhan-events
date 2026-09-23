import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import App from "@/App";
import QueryProvider from "@/providers/QueryProvider";
import { SettingsProvider } from "@/providers/SettingsProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import "@/styles/index.css";

/**
 * GitHub Pages SPA fallback. Pages answers unknown paths with public/404.html,
 * which rewrites the URL to `?/<path>`; convert it back into a real path here,
 * before the router reads the location, so deep links and refreshes work.
 */
if (window.location.search.startsWith("?/")) {
  const decoded = window.location.search
    .slice(1)
    .split("&")
    .map((part) => part.replace(/~and~/g, "&"))
    .join("?");
  window.history.replaceState(
    null,
    "",
    window.location.pathname.slice(0, -1) + decoded + window.location.hash
  );
}

/** "/" locally, "/<repo>" on GitHub Pages — comes from Vite's base. */
const BASENAME = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <QueryProvider>
        <BrowserRouter basename={BASENAME}>
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
