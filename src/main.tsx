import "@fontsource-variable/onest";
import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ChatProvider } from "./chat/ChatContext";

const root = document.getElementById("root");
if (!root) {
  throw new Error("The #root element is missing from index.html.");
}

createRoot(root).render(
  <StrictMode>
    <ChatProvider>
      <App />
    </ChatProvider>
  </StrictMode>,
);
