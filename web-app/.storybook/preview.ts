import type { Preview } from "@storybook/react";
import React from "react";
import "../src/app/globals.css";

const preview: Preview = {
  parameters: {
    backgrounds: {
      disable: true,
    },
    layout: "centered",
  },
  decorators: [
    (Story) =>
      React.createElement(
        "div",
        {
          className: "dark",
          style: {
            backgroundColor: "var(--bg-deep)",
            color: "var(--text-primary)",
            minHeight: "100vh",
            padding: "2rem",
            fontFamily: "'DM Sans', sans-serif",
            "--font-chakra-petch": "'Chakra Petch', sans-serif",
            "--font-dm-sans": "'DM Sans', sans-serif",
            "--font-jetbrains-mono": "'JetBrains Mono', monospace",
          } as React.CSSProperties,
        },
        React.createElement(Story)
      ),
  ],
};

export default preview;
