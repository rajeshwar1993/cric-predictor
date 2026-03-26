// Mock next/navigation for Storybook (react-vite framework)
import { fn } from "@storybook/test";

export const useRouter = () => ({
  push: fn().mockName("router.push"),
  replace: fn().mockName("router.replace"),
  refresh: fn().mockName("router.refresh"),
  back: fn().mockName("router.back"),
  forward: fn().mockName("router.forward"),
  prefetch: fn().mockName("router.prefetch"),
});

export const useSearchParams = () => new URLSearchParams();

export const usePathname = () => "/dashboard";

export const useParams = () => ({});

export const redirect = fn().mockName("redirect");

export const notFound = fn().mockName("notFound");
