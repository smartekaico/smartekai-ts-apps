// @ts-check

import tseslint from "typescript-eslint";

export default tseslint.config(
  tseslint.configs.recommended,
  {
    ignores: ["dist/**", "eslint.config.js"],
  },
);
