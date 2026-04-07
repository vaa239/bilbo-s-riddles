import { describe, expect, it } from "vitest";

describe("worker health shape", () => {
  it("documents expected /api/health JSON keys for deploy smoke test", () => {
    const body = { version: "v0.0.1", git_sha: "abc123" };
    expect(body).toHaveProperty("version");
    expect(body).toHaveProperty("git_sha");
  });
});
