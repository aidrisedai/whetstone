import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  {
    rules: {
      // The react-hooks/set-state-in-effect rule (React 19 strict-mode lint) fires on many
      // legitimate browser-API integration patterns throughout this codebase: SSR-safe feature
      // detection (setSupported), external-state syncing (mic transcript → controlled input,
      // browser TTS speaking → local state), and interval-reset sequences. Disabling globally
      // until the rule matures or the codebase is refactored to event-driven patterns.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];
export default config;
