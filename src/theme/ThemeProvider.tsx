import { createContext, useContext, type ReactNode } from 'react';

import { darkColors, lightColors, type ThemeColors } from './colors';

const ThemeContext = createContext<ThemeColors>(lightColors);

/** Screens choose light (most screens) or dark (Prime Control, Avatar Studio). */
export function ThemeProvider({ mode, children }: { mode: 'light' | 'dark'; children: ReactNode }) {
  return <ThemeContext.Provider value={mode === 'dark' ? darkColors : lightColors}>{children}</ThemeContext.Provider>;
}

export const useColors = () => useContext(ThemeContext);
