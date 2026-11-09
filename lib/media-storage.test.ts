import { describe, it, expect, vi } from "vitest";
import { __setRetryDelay, authHeaders, ensureBucket, isStoredMediaUrl, MediaError, parseDataUrl, resolveCover, storageConfig, storeImage } from "./media-storage";

const ENV = { SUPABASE_URL: "https://abc.supabase.co/", SUPABASE_SERVICE_ROLE_KEY: "service-key" } as unknown as NodeJS.ProcessEnv;
// 1x1 PNG
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const ok = () => new Response("{}", { status: 200 });
__setRetryDelay(0);

describe("media storage", () => {
  it("sends new sb_secret_ keys on apikey only; legacy JWT keys on both headers", async () => {
    expect(authHeaders("sb_secret_abc")).toEqual({ apikey: "sb_secret_abc" });
    expect(authHeaders("eyJhbGciOi.legacy.jwt")).toEqual({ apikey: "eyJhbGciOi.legacy.jwt", Authorization: "Bearer eyJhbGciOi.legacy.jwt" });
    const f = vi.fn(async () => ok());
    await storeImage(PNG, "avatars", f as never, { ...ENV, SUPABASE_SERVICE_ROLE_KEY: "sb_secret_xyz" } as NodeJS.ProcessEnv);
    const h = (f.mock.calls[0] as unknown as [string, RequestInit])[1].headers as Record<string, string>;
    expect(h.apikey).toBe("sb_secret_xyz");
    expect(h.Authorization).toBeUndefined();
  });

  it("is off without both env vars", () => {
    expect(storageConfig({} as NodeJS.ProcessEnv)).toBeNull();
    expect(storageConfig({ SUPABASE_URL: "https://x.supabase.co" } as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(storageConfig(ENV)).toEqual({ url: "https://abc.supabase.co", key: "service-key", bucket: "media" });
  });

  it("accepts only real image data URLs under 2MB", () => {
    expect(parseDataUrl(PNG)?.mime).toBe("image/png");
    expect(parseDataUrl("data:image/svg+xml;base64,PHN2Zz4=")).toBeNull(); // SVG can carry script
    expect(parseDataUrl("data:text/html;base64,PGI+")).toBeNull();
    expect(parseDataUrl(`data:image/jpeg;base64,${"A".repeat(3_000_000)}`)).toBeNull();
    expect(parseDataUrl("https://x.com/a.png")).toBeNull();
  });

  it("uploads content-addressed with a long cache, and returns the public URL", async () => {
    const f = vi.fn(async () => ok());
    const url = await storeImage(PNG, "avatars", f as never, ENV);
    expect(url).toMatch(/^https:\/\/abc\.supabase\.co\/storage\/v1\/object\/public\/media\/avatars\/[a-f0-9]{64}\.png$/);
    const [endpoint, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(endpoint).toBe(url.replace("/object/public/", "/object/"));
    const h = init.headers as Record<string, string>;
    expect(h).toMatchObject({ Authorization: "Bearer service-key", "Content-Type": "image/png", "cache-control": "max-age=31536000", "x-upsert": "true" });
    // Same bytes → same URL.
    expect(await storeImage(PNG, "avatars", f as never, ENV)).toBe(url);
    expect(isStoredMediaUrl(url, ENV)).toBe(true);
  });

  it("keeps the data URL when Storage isn't configured; refuses bad images either way", async () => {
    const f = vi.fn();
    expect(await storeImage(PNG, "logos", f as never, {} as NodeJS.ProcessEnv)).toBe(PNG);
    expect(f).not.toHaveBeenCalled();
    await expect(storeImage("data:text/plain;base64,aGk=", "logos", f as never, ENV)).rejects.toBeInstanceOf(MediaError);
  });

  it("reports a failed upload instead of saving a broken URL", async () => {
    await expect(storeImage(PNG, "covers", vi.fn(async () => new Response("no", { status: 403 })) as never, ENV)).rejects.toBeInstanceOf(MediaError);
    await expect(storeImage(PNG, "covers", vi.fn(async () => { throw new Error("ECONNRESET"); }) as never, ENV)).rejects.toBeInstanceOf(MediaError);
  });

  it("retries Supabase's transient 5xx (e.g. Cloudflare 520), never a 4xx", async () => {
    const flaky = vi.fn().mockResolvedValueOnce(new Response("<html>520</html>", { status: 520 })).mockResolvedValueOnce(ok());
    expect(await storeImage(PNG, "covers", flaky as never, ENV)).toMatch(/\/covers\/[a-f0-9]{64}\.png$/);
    expect(flaky).toHaveBeenCalledTimes(2);

    const notFound = vi.fn(async () => new Response('{"error":"Bucket not found"}', { status: 400 }));
    await expect(storeImage(PNG, "covers", notFound as never, ENV)).rejects.toBeInstanceOf(MediaError);
    expect(notFound).toHaveBeenCalledTimes(1);

    const down = vi.fn(async () => new Response("", { status: 503 }));
    await expect(storeImage(PNG, "covers", down as never, ENV)).rejects.toBeInstanceOf(MediaError);
    expect(down).toHaveBeenCalledTimes(3);
  });

  it("only treats our own bucket's paths as stored", () => {
    const ours = "https://abc.supabase.co/storage/v1/object/public/media/covers/" + "a".repeat(64) + ".jpg";
    expect(isStoredMediaUrl(ours, ENV)).toBe(true);
    expect(isStoredMediaUrl(ours.replace("abc", "evil"), ENV)).toBe(false);
    expect(isStoredMediaUrl(ours.replace("/media/", "/other/"), ENV)).toBe(false);
    expect(isStoredMediaUrl(ours + "?x=1", ENV)).toBe(false);
    expect(isStoredMediaUrl(ours, {} as NodeJS.ProcessEnv)).toBe(false);
  });

  it("creates the public bucket once", async () => {
    const exists = vi.fn(async () => ok());
    expect(await ensureBucket(exists as never, ENV)).toBe("exists");
    const calls: string[] = [];
    const missing = vi.fn(async (u: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? "GET"} ${u}`);
      return u.endsWith("/bucket/media") ? new Response("", { status: 404 }) : ok();
    });
    expect(await ensureBucket(missing as never, ENV)).toBe("created");
    expect(calls).toEqual(["GET https://abc.supabase.co/storage/v1/bucket/media", "POST https://abc.supabase.co/storage/v1/bucket"]);
    expect(JSON.parse(String((missing.mock.calls[1] as unknown as [string, RequestInit])[1].body))).toMatchObject({ id: "media", public: true });
  });
});

describe("resolveCover", () => {
  it("keeps the current cover, drops foreign URLs, and passes data URLs through when Storage is off", async () => {
    delete process.env.SUPABASE_URL;
    expect(await resolveCover(null)).toBeNull();
    expect(await resolveCover(PNG)).toBe(PNG);
    expect(await resolveCover("https://elsewhere.test/a.jpg", "existing")).toBe("existing");
    expect(await resolveCover("existing", "existing")).toBe("existing");
  });
});
