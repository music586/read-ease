import { describe, expect, it } from "vitest";
import manifest from "../../public/manifest.json";

describe("manifest", () => {
  it("uses Manifest V3 with minimal default permissions", () => {
    expect(manifest.manifest_version).toBe(3);
    expect([...manifest.permissions].sort()).toEqual(
      ["activeTab", "commands", "scripting", "storage"].sort(),
    );
    expect(manifest).not.toHaveProperty("host_permissions");
    expect(manifest.optional_host_permissions).toEqual([
      "http://*/*",
      "https://*/*",
    ]);
  });
});

