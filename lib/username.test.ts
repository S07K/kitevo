import { describe, expect, it } from "vitest";
import { normalizeUsername, usernameBase, usernameCandidates, usernameProblem } from "./username";

describe("username rules", () => {
  it("normalises and validates", () => {
    expect(normalizeUsername("  Priya Sharma ")).toBe("priya-sharma");
    expect(usernameProblem("priya-sharma")).toBeNull();
    expect(usernameProblem("a")).toMatch(/At least/);
    expect(usernameProblem("-priya")).toMatch(/hyphen/);
    expect(usernameProblem("priya_s")).toMatch(/Only letters/);
  });

  it("reserves app routes, including the new referral and admin pages", () => {
    for (const r of ["admin", "referrals", "referral-program", "blog", "dashboard", "kit"]) {
      expect(usernameProblem(r)).toBe("That username is reserved");
    }
  });

  it("derives a base from a name or email", () => {
    expect(usernameBase("Priya Sharma")).toBe("priyasharma");
    expect(usernameBase("José Núñez")).toBe("josenunez");
    expect(usernameBase("jane.doe+promo@gmail.com")).toBe("janedoe");
    expect(usernameBase("李")).toBe("creator");
  });

  it("suggests valid candidates, base first", () => {
    const c = usernameCandidates("priyasharma", 5);
    expect(c[0]).toBe("priyasharma");
    expect(c.every((x) => usernameProblem(x) === null)).toBe(true);
  });
});
