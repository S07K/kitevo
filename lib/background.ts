import { after } from "next/server";

/**
 * Run a side effect (an email, a webhook) after the response is sent. A slow or failing task
 * can never delay or break the request that triggered it; failures are logged by name.
 * Outside a request scope (scripts, tests) `after` throws, so the task just runs now.
 */
export function inBackground(label: string, task: () => Promise<unknown>): void {
  const run = async () => {
    try {
      await task();
    } catch (e) {
      console.error(`[background:${label}]`, e);
    }
  };
  try {
    after(run);
  } catch {
    void run();
  }
}
