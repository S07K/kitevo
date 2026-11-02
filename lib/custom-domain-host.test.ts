import { describe, it, expect, vi } from "vitest";

vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://getkitevo.com");
vi.stubEnv("APP_HOSTS", "staging.getkitevo.com");
const { isAppHost, customDomainRoute } = await import("./custom-domain-host");

describe("isAppHost", () => {
  it("recognises Kitevo's own hosts", () => {
    for (const h of ["getkitevo.com", "www.getkitevo.com", "GETKITEVO.COM:443", "localhost:3000", "127.0.0.1", "kitevo-git-x.vercel.app", "staging.getkitevo.com", null]) {
      expect(isAppHost(h)).toBe(true);
    }
  });
  it("treats anything else as a custom domain", () => {
    for (const h of ["kit.alexchen.com", "alexchen.com", "getkitevo.com.evil.io", "evilgetkitevo.com"]) {
      expect(isAppHost(h)).toBe(false);
    }
  });
});

describe("customDomainRoute", () => {
  it("serves the kit at the root, passes the kit's API and assets, redirects the rest", () => {
    expect(customDomainRoute("/")).toBe("kit");
    expect(customDomainRoute("/api/kits/k1/inquire")).toBe("passthrough");
    expect(customDomainRoute("/_next/static/chunk.js")).toBe("passthrough");
    expect(customDomainRoute("/favicon.ico")).toBe("passthrough");
    expect(customDomainRoute("/signup")).toBe("redirect");
    expect(customDomainRoute("/kit/someone-else")).toBe("redirect");
    expect(customDomainRoute("/dashboard")).toBe("redirect");
  });
});
