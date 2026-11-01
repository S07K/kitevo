import { randomBytes } from "crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  activeTokenKeyId,
  decryptPlatformTokens,
  decryptToken,
  encryptToken,
  isEncryptedToken,
  parseKeyring,
  tokenKeyId,
} from "./token-crypto";

const k = () => randomBytes(32).toString("base64");
const KEY_A = k();
const KEY_B = k();

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("token-crypto", () => {
  it("round-trips a token and never stores the plaintext", () => {
    vi.stubEnv("TOKEN_ENCRYPTION_KEYS", `a:${KEY_A}`);
    const sealed = encryptToken("IGQVJ-secret-token");
    expect(isEncryptedToken(sealed)).toBe(true);
    expect(sealed).not.toContain("secret");
    expect(tokenKeyId(sealed)).toBe("a");
    expect(decryptToken(sealed)).toBe("IGQVJ-secret-token");
  });

  it("uses a fresh IV each time", () => {
    vi.stubEnv("TOKEN_ENCRYPTION_KEYS", `a:${KEY_A}`);
    expect(encryptToken("same")).not.toBe(encryptToken("same"));
  });

  it("passes legacy plaintext through and does not double-encrypt", () => {
    vi.stubEnv("TOKEN_ENCRYPTION_KEYS", `a:${KEY_A}`);
    expect(decryptToken("legacy-plain")).toBe("legacy-plain");
    const sealed = encryptToken("x");
    expect(encryptToken(sealed)).toBe(sealed);
  });

  it("keeps null/empty as null", () => {
    vi.stubEnv("TOKEN_ENCRYPTION_KEYS", `a:${KEY_A}`);
    expect(encryptToken(null)).toBeNull();
    expect(decryptToken(null)).toBeNull();
    expect(decryptToken("")).toBeNull();
  });

  it("supports rotation: first key encrypts, older keys still decrypt", () => {
    vi.stubEnv("TOKEN_ENCRYPTION_KEYS", `a:${KEY_A}`);
    const old = encryptToken("tok");
    vi.stubEnv("TOKEN_ENCRYPTION_KEYS", `b:${KEY_B},a:${KEY_A}`);
    expect(activeTokenKeyId()).toBe("b");
    expect(decryptToken(old)).toBe("tok");
    expect(tokenKeyId(encryptToken("tok"))).toBe("b");
  });

  it("fails closed: unknown key or tampered ciphertext decrypts to null", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("TOKEN_ENCRYPTION_KEYS", `a:${KEY_A}`);
    const sealed = encryptToken("tok");
    const parts = sealed.split(":");
    const ct = Buffer.from(parts[4], "base64url");
    ct[0] ^= 0xff;
    expect(decryptToken([...parts.slice(0, 4), ct.toString("base64url")].join(":"))).toBeNull();
    vi.stubEnv("TOKEN_ENCRYPTION_KEYS", `b:${KEY_B}`);
    expect(decryptToken(sealed)).toBeNull();
  });

  it("stores plaintext (with a warning) when no key is configured", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("TOKEN_ENCRYPTION_KEYS", "");
    expect(encryptToken("tok")).toBe("tok");
  });

  it("accepts a bare key as id k1", () => {
    vi.stubEnv("TOKEN_ENCRYPTION_KEYS", KEY_A);
    expect(activeTokenKeyId()).toBe("k1");
    expect(decryptToken(encryptToken("tok"))).toBe("tok");
  });

  it("rejects malformed keyrings", () => {
    expect(() => parseKeyring("nokey")).toThrow();
    expect(() => parseKeyring(`a:${Buffer.alloc(16).toString("base64")}`)).toThrow();
    expect(() => parseKeyring(`a:${KEY_A},a:${KEY_B}`)).toThrow();
    expect(parseKeyring("")).toBeNull();
  });

  it("decryptPlatformTokens decrypts only the token fields present", () => {
    vi.stubEnv("TOKEN_ENCRYPTION_KEYS", `a:${KEY_A}`);
    const row = { instagramUserId: "123", instagramAccessToken: encryptToken("ig"), youtubeRefreshToken: null };
    expect(decryptPlatformTokens(row)).toEqual({ instagramUserId: "123", instagramAccessToken: "ig", youtubeRefreshToken: null });
    expect(decryptPlatformTokens(null)).toBeNull();
  });
});
