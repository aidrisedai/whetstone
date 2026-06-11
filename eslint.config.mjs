import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    // App Router uses layout.tsx for fonts, not pages/_document.js.
    rules: {
      "@next/next/no-page-custom-font": "off",
    },
  },
];

export default eslintConfig;
