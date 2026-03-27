import { registerTransport } from "@/lib/logger";
import { createPostHogTransport } from "./transport";

let registered = false;

export function ensureServerTransport(): void {
  if (registered) return;
  registerTransport(createPostHogTransport());
  registered = true;
}
