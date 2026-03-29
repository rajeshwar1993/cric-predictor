import { describe, it, expect } from "vitest";
import { sanitizeProperties, hashIdentifier } from "./sanitize";

describe("sanitizeProperties", () => {
  it("strips all known PII fields", () => {
    const input = {
      email: "user@example.com",
      display_name: "Alice",
      displayName: "Alice",
      date_of_birth: "1990-01-01",
      dateOfBirth: "1990-01-01",
      phone: "+1234567890",
      ip: "192.168.1.1",
      ip_address: "10.0.0.1",
      user_agent: "Mozilla/5.0",
      user_agent_full: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      group_id: "abc-123",
    };

    const result = sanitizeProperties(input);

    expect(result).toEqual({ group_id: "abc-123" });
    expect(result).not.toHaveProperty("email");
    expect(result).not.toHaveProperty("display_name");
    expect(result).not.toHaveProperty("displayName");
    expect(result).not.toHaveProperty("date_of_birth");
    expect(result).not.toHaveProperty("dateOfBirth");
    expect(result).not.toHaveProperty("phone");
    expect(result).not.toHaveProperty("ip");
    expect(result).not.toHaveProperty("ip_address");
    expect(result).not.toHaveProperty("user_agent");
    expect(result).not.toHaveProperty("user_agent_full");
  });

  it("preserves all non-PII fields", () => {
    const input = {
      userId: "uuid-abc-123",
      group_id: "group-456",
      match_id: 42,
      scenario_id: "scen-789",
      action: "approve",
      success: true,
      duration_ms: 150,
      page_path: "/dashboard",
    };

    const result = sanitizeProperties(input);

    expect(result).toEqual(input);
  });

  it("returns empty object for input with only PII fields", () => {
    const input = {
      email: "secret@example.com",
      display_name: "Secret Name",
    };

    const result = sanitizeProperties(input);

    expect(result).toEqual({});
  });

  it("returns empty object for empty input", () => {
    const result = sanitizeProperties({});

    expect(result).toEqual({});
  });

  it("does not mutate the input object", () => {
    const input = { email: "test@test.com", group_id: "g1" };
    const inputCopy = { ...input };

    sanitizeProperties(input);

    expect(input).toEqual(inputCopy);
  });

  it("preserves nested objects as values without deep sanitizing", () => {
    const input = {
      metadata: { email: "nested@example.com", count: 5 },
      group_id: "g1",
    };

    const result = sanitizeProperties(input);

    // The top-level key "metadata" is not a PII field, so the whole value is preserved.
    // Deep sanitization of nested objects is not the responsibility of this function.
    expect(result).toEqual({
      metadata: { email: "nested@example.com", count: 5 },
      group_id: "g1",
    });
  });

  it("handles null and undefined values in non-PII fields", () => {
    const input = {
      group_id: null,
      match_id: undefined,
      scenario_id: "s1",
    };

    const result = sanitizeProperties(input as Record<string, unknown>);

    expect(result).toEqual({
      group_id: null,
      match_id: undefined,
      scenario_id: "s1",
    });
  });
});

describe("hashIdentifier", () => {
  it("produces a 64-character hex string (SHA-256)", async () => {
    const result = await hashIdentifier("test@example.com");

    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces consistent hashes for the same input", async () => {
    const hash1 = await hashIdentifier("user@example.com");
    const hash2 = await hashIdentifier("user@example.com");

    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different inputs", async () => {
    const hash1 = await hashIdentifier("alice@example.com");
    const hash2 = await hashIdentifier("bob@example.com");

    expect(hash1).not.toBe(hash2);
  });

  it("is case-insensitive (lowercases input)", async () => {
    const hash1 = await hashIdentifier("User@Example.COM");
    const hash2 = await hashIdentifier("user@example.com");

    expect(hash1).toBe(hash2);
  });

  it("trims whitespace before hashing", async () => {
    const hash1 = await hashIdentifier("  user@example.com  ");
    const hash2 = await hashIdentifier("user@example.com");

    expect(hash1).toBe(hash2);
  });
});
