import React from "react";
import "../styles.css";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <div className="ts-theme-root">{children}</div>;
};

export default ThemeProvider;
