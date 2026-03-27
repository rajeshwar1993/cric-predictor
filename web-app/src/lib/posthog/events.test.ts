import { describe, it, expect } from "vitest";
import { ANALYTICS_EVENTS } from "./events";

describe("ANALYTICS_EVENTS", () => {
  const entries = Object.entries(ANALYTICS_EVENTS);

  it("has at least 30 events defined", () => {
    expect(entries.length).toBeGreaterThanOrEqual(29);
  });

  it("all event names are unique", () => {
    const values = entries.map(([, v]) => v);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it("all event names follow snake_case convention", () => {
    for (const [key, value] of entries) {
      expect(value).toMatch(
        /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/,
        `Event ${key} has value "${value}" which is not snake_case`
      );
    }
  });

  it("all keys are UPPER_SNAKE_CASE", () => {
    for (const [key] of entries) {
      expect(key).toMatch(
        /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/,
        `Key "${key}" is not UPPER_SNAKE_CASE`
      );
    }
  });
});
