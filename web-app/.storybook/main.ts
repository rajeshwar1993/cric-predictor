import type { StorybookConfig } from "@storybook/react-vite";
import path from "path";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-a11y",
    "@storybook/addon-interactions",
    "@storybook/addon-themes",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  staticDirs: ["../public"],
  viteFinal: async (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      // Path alias matching tsconfig
      "@": path.resolve(__dirname, "../src"),
      // Mock Next.js modules (since we use react-vite, not @storybook/nextjs)
      "next/navigation": path.resolve(
        __dirname,
        "../src/__mocks__/handlers/next-navigation.ts"
      ),
      "next/link": path.resolve(
        __dirname,
        "../src/__mocks__/handlers/next-link.tsx"
      ),
      // Mock Supabase client (browser)
      "@/lib/supabase/client": path.resolve(
        __dirname,
        "../src/__mocks__/handlers/supabase.ts"
      ),
      // Mock server actions
      "@/lib/actions/auth": path.resolve(
        __dirname,
        "../src/__mocks__/handlers/action-auth.ts"
      ),
      "@/lib/actions/groups": path.resolve(
        __dirname,
        "../src/__mocks__/handlers/action-groups.ts"
      ),
      "@/lib/actions/predictions": path.resolve(
        __dirname,
        "../src/__mocks__/handlers/action-predictions.ts"
      ),
      "@/lib/actions/scenarios": path.resolve(
        __dirname,
        "../src/__mocks__/handlers/action-scenarios.ts"
      ),
      "@/lib/actions/admin": path.resolve(
        __dirname,
        "../src/__mocks__/handlers/action-admin.ts"
      ),
      "@/lib/actions/notifications": path.resolve(
        __dirname,
        "../src/__mocks__/handlers/action-notifications.ts"
      ),
      // Mock realtime hook
      "@/hooks/use-realtime": path.resolve(
        __dirname,
        "../src/__mocks__/handlers/use-realtime.ts"
      ),
    };

    // Add PostCSS plugin for Tailwind v4
    config.css = config.css || {};
    config.css.postcss = path.resolve(__dirname, "../postcss.config.mjs");

    // Polyfill process.env for browser (Next.js does this automatically, Vite does not)
    config.define = {
      ...config.define,
      "process.env.NEXT_PUBLIC_APP_NAME": JSON.stringify("Bragg"),
      "process.env.NEXT_PUBLIC_APP_URL": JSON.stringify("http://localhost:3000"),
      "process.env.NEXT_PUBLIC_MOCK_MODE": JSON.stringify("true"),
      "process.env.NEXT_PUBLIC_SUPABASE_URL": JSON.stringify("http://localhost:54321"),
      "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": JSON.stringify("mock-anon-key"),
    };

    return config;
  },
};

export default config;
