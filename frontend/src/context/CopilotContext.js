import React, { createContext, useContext, useState } from "react";

const CopilotCtx = createContext(null);

export function CopilotProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [seedPrompt, setSeedPrompt] = useState("");

  const openWith = (prompt = "") => {
    setSeedPrompt(prompt);
    setOpen(true);
  };

  return (
    <CopilotCtx.Provider value={{ open, setOpen, seedPrompt, openWith }}>
      {children}
    </CopilotCtx.Provider>
  );
}

export const useCopilot = () => useContext(CopilotCtx);
