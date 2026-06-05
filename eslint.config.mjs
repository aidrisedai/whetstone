import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  {
    ignores: [".next/**", "node_modules/**"],
  },
  {
    rules: {
      // App Router uses next/font in layout.tsx, not pages/_document.js — false positive.
      "@next/next/no-page-custom-font": "off",
      // setState inside useEffect is the correct pattern for feature-detection and
      // external-system sync (useSpeechRecognition, useSpeechSynthesis, etc.).
      "react-hooks/set-state-in-effect": "off",
      // Local accumulator variables inside Array.map() during render are valid.
      // e.g. `let seen = 0; words.map(() => { seen += 1; ... })`
      "react-hooks/immutability": "off",
    },
  },
];

export default config;
