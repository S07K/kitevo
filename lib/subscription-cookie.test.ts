import { describe, it, expect } from "vitest";
import {
  setSubscriptionCookie,
  getSubscriptionCustomerId,
  clearSubscriptionCookie,
} from "./subscription-cookie";

describe("subscription-cookie", () => {
  describe("setSubscriptionCookie", () => {
    it("returns Set-Cookie header containing customer id and signature", () => {
      const header = setSubscriptionCookie("cus_abc123");
      expect(header).toContain("media_kit_pro_customer=");
      expect(header).toContain("Path=/");
      expect(header).toContain("HttpOnly");
      expect(header).toContain("SameSite=Lax");
      expect(header).toContain("Max-Age=");
    });
  });

  describe("getSubscriptionCustomerId", () => {
    it("returns null when cookie header is null", () => {
      expect(getSubscriptionCustomerId(null)).toBeNull();
    });

    it("returns null when cookie header does not contain the subscription cookie", () => {
      expect(getSubscriptionCustomerId("other=value")).toBeNull();
    });

    it("returns customer id when cookie is valid (round-trip)", () => {
      const customerId = "cus_test123";
      const header = setSubscriptionCookie(customerId);
      const cookieValue = header.split(";")[0].replace("media_kit_pro_customer=", "");
      const parsed = getSubscriptionCustomerId(`media_kit_pro_customer=${cookieValue}`);
      expect(parsed).toBe(customerId);
    });

    it("returns null when cookie value is tampered", () => {
      const header = setSubscriptionCookie("cus_abc");
      const cookieValue = header.split(";")[0].replace("media_kit_pro_customer=", "");
      const tampered = cookieValue.slice(0, -4) + "xxxx";
      expect(getSubscriptionCustomerId(`media_kit_pro_customer=${tampered}`)).toBeNull();
    });
  });

  describe("clearSubscriptionCookie", () => {
    it("returns Set-Cookie with Max-Age=0 to clear", () => {
      const header = clearSubscriptionCookie();
      expect(header).toContain("media_kit_pro_customer=;");
      expect(header).toContain("Max-Age=0");
    });
  });
});
