import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  {
    rules: {
      // App Router loads fonts in layout.tsx, not pages/_document.js — false positive.
      "@next/next/no-page-custom-font": "off",
      // Browser API capability detection (SpeechRecognition, SpeechSynthesis) must
      // run in useEffect because `window` doesn't exist on the server. The extra
      // mount-time render is intentional and SSR-safe.
      "react-hooks/set-state-in-effect": "off",
      // Local-variable mutation inside useMemo/render is valid without the React
      // Compiler. Disabling this compiler-specific rule for the non-compiler build.
      "react-hooks/immutability": "off",
    },
  },
];

export default config;
