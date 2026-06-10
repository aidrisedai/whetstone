import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  {
    rules: {
      // Browser feature-detection and derived-state sync in effects are legitimate
      // patterns throughout this codebase (useSpeechRecognition, useSpeechSynthesis,
      // useTeacherVoice). The rule produces false positives for these use cases.
      "react-hooks/set-state-in-effect": "off",

      // App Router (layout.tsx) is not subject to the Pages Router font restriction.
      "@next/next/no-page-custom-font": "off",
    },
  },
];

export default config;
