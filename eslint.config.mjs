import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  {
    rules: {
      // Next.js App Router uses fonts in layout.tsx, not pages/_document.js.
      "@next/next/no-page-custom-font": "off",
      // Too strict for the established React pattern of detecting browser APIs
      // inside useEffect and calling setState once. React's own docs recommend this.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default config;
