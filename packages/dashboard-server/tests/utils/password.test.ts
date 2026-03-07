import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "#utils/password.util.js";

describe("password utility", () => {
  it("produces salt:hash format", async () => {
    const hash = await hashPassword("test123");
    expect(hash).toMatch(/^[a-f0-9]+:[a-f0-9]+$/);
  });

  it("verifies correct password", async () => {
    const hash = await hashPassword("mypassword");
    expect(await verifyPassword("mypassword", hash)).toBe(true);
  });

  it("rejects wrong password", async () => {
    const hash = await hashPassword("mypassword");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("produces different hashes for same input (random salt)", async () => {
    const a = await hashPassword("same");
    const b = await hashPassword("same");
    expect(a).not.toBe(b);
  });
});
