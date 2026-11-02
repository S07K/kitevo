import { describe, it, expect, vi, beforeEach } from "vitest";

const getAdmin = vi.fn();
vi.mock("@/lib/admin", () => ({ getAdmin: () => getAdmin() }));

import { GET } from "./route";

describe("GET /api/me/admin", () => {
  beforeEach(() => getAdmin.mockReset());

  it("reports true for an admin", async () => {
    getAdmin.mockResolvedValue({ id: "u1", email: "a@x.com" });
    const res = await GET();
    expect(await res.json()).toEqual({ admin: true });
    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });

  it("reports false for anyone else, without leaking details", async () => {
    getAdmin.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ admin: false });
  });
});
