// eslint-config-next ships as a native flat-config array in Next.js 16.
import nextConfig from "eslint-config-next";

export default [
  ...nextConfig,
  {
    rules: {
      // react-hooks/set-state-in-effect flags legitimate initialization
      // patterns (setSupported on mount, setChat on stage change, setSpeaking
      // to mirror external state) that are correct and intentional.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];
