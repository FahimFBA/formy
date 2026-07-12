// By: Md. Fahim Bin Amin
//
// React language context: exposes the signed-in user's UI language and a
// t(key, params) translator backed by label-universe/labels.json. The active
// language is cached in localStorage so it applies before the profile request
// resolves, and kept in sync with the account's stored preference by Layout after
// every profile fetch. See label-universe/README.md.

import { createContext, useContext, useEffect, useState } from "react";

import rawLabels from "../../../label-universe/labels.json";

export const SUPPORTED_LANGUAGES = ["en", "es", "zh"];
export const DEFAULT_LANGUAGE = "en";

const STORAGE_KEY = "formy_language";
const LanguageContext = createContext(null);

/**
 * @returns {string} the language cached on this device, or DEFAULT_LANGUAGE if unset
 *   or no longer supported
 */
function readStoredLanguage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return SUPPORTED_LANGUAGES.includes(stored) ? stored : DEFAULT_LANGUAGE;
}

/**
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(readStoredLanguage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  /**
   * @param {string} nextLanguage - one of SUPPORTED_LANGUAGES; anything else falls
   *   back to DEFAULT_LANGUAGE
   * @returns {void}
   */
  function setLanguage(nextLanguage) {
    setLanguageState(SUPPORTED_LANGUAGES.includes(nextLanguage) ? nextLanguage : DEFAULT_LANGUAGE);
  }

  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}

/**
 * @returns {{
 *   language: string,
 *   setLanguage: (lang: string) => void,
 *   t: (key: string, params?: Object<string, string>) => string,
 * }}
 */
export function useTranslation() {
  const context = useContext(LanguageContext);

  /**
   * @param {string} key - a key from labels.json
   * @param {Object<string, string>} [params] - values to substitute for {placeholder} tokens
   * @returns {string} the label in the current language, falling back to English,
   *   with every {param} token replaced
   */
  function t(key, params = {}) {
    const entry = rawLabels[key];
    const template = entry[context.language] ?? entry[DEFAULT_LANGUAGE];
    return template.replace(/\{(\w+)\}/g, (match, name) => (name in params ? params[name] : match));
  }

  return { language: context.language, setLanguage: context.setLanguage, t };
}
