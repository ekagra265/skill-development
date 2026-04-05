"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Language } from "./types";

interface LangContextValue {
  lang: Language;
  setLang: (l: Language) => void;
  isHindi: boolean;
}

const LangContext = createContext<LangContextValue>({
  lang: "en",
  setLang: () => {},
  isHindi: false,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>("en");
  return (
    <LangContext.Provider value={{ lang, setLang, isHindi: lang === "hi" }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
