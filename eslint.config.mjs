import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // Allow 'any' in logger and error-handler files
      "@typescript-eslint/no-explicit-any": "error",
      // Disable the rule requiring Next.js Image component instead of img
      "@next/next/no-img-element": "off",
    },
  },
  {
    files: ["src/lib/logger.ts", "src/lib/error-handler.ts", "src/app/api/auth/oauth/callback/route.ts"],
    rules: {
      // Disable the no-explicit-any rule for these specific files
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default eslintConfig;
