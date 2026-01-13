import next from "eslint-config-next/core-web-vitals";

export default [
  ...next,
  {
    files: ["**/*.{js,jsx,mjs,ts,tsx}"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    ignores: ["**/.next/**", "**/node_modules/**", "eslint.config.mjs"],
  },
];
