import next from "eslint-config-next/core-web-vitals";
import ts from "eslint-config-next/typescript";

const config = [
  ...next,
  ...ts,
  { ignores: [".next/**", ".fixture/**", "next-env.d.ts"] },
  {
    // Gallery images already have persistent, size-specific derivatives.
    rules: {
      "@next/next/no-img-element": "off",
      // Opening a page must always check the published revision.
      "@next/next/no-html-link-for-pages": "off",
    },
  },
];

export default config;
