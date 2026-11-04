// @vitest-environment node
// The package's first state (cinatra#4366): an artifact pack named for the
// website pages it draws, declaring the one representation the page snapshot
// is filed as, and claiming no type and shipping no renderer yet. The typed
// export mirrors package.json.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { PAGE_SNAPSHOT_MIME, websiteArtifactsManifest } from "../src/index";

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"),
) as {
  name: string;
  license: string;
  files: string[];
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  cinatra: {
    kind: string;
    apiVersion: string;
    displayName: string;
    vendor: { key: string; name: string };
    dependencies: unknown[];
    artifact: Record<string, unknown> & { accepts: { file: { mimeTypes: string[] } } };
  };
};

describe("manifest — the first state of the website pack", () => {
  it("names the pack per the plural kind convention (@cinatra-ai/<slug>-artifacts)", () => {
    expect(pkg.name).toBe("@cinatra-ai/website-artifacts");
    expect(pkg.name).toMatch(/^@cinatra-ai\/[a-z0-9][a-z0-9-]*-artifacts?$/);
    expect(pkg.cinatra.kind).toBe("artifact");
    expect(pkg.cinatra.apiVersion).toBe("cinatra.ai/v1");
    expect(pkg.license).toBe("Apache-2.0");
  });

  it("carries the kind label the drawing gives the page", () => {
    expect(pkg.cinatra.displayName).toBe("CMS page");
    expect(pkg.cinatra.vendor).toEqual({ key: "cinatra-ai", name: "Cinatra" });
  });

  it("declares the one representation the page snapshot is filed as", () => {
    expect(PAGE_SNAPSHOT_MIME).toBe("application/json");
    expect(pkg.cinatra.artifact.accepts).toEqual({ file: { mimeTypes: [PAGE_SNAPSHOT_MIME] } });
  });

  it("claims no type and ships no renderer yet", () => {
    expect(Object.keys(pkg.cinatra.artifact)).toEqual(["accepts"]);
    expect(pkg.cinatra.artifact.objectTypes).toBeUndefined();
    expect(pkg.cinatra.artifact.ui).toBeUndefined();
  });

  it("depends on no other extension and on no first-party package", () => {
    expect(pkg.cinatra.dependencies).toEqual([]);
    const firstParty = (deps: Record<string, string> | undefined): string[] =>
      Object.keys(deps ?? {}).filter((name) => name.startsWith("@cinatra-ai/") || name.startsWith("@cinatra/"));
    expect(firstParty(pkg.dependencies)).toEqual([]);
    expect(firstParty(pkg.peerDependencies)).toEqual([]);
  });

  it("publishes its source tree only", () => {
    expect(pkg.files).toEqual(["src"]);
  });

  it("the typed manifest equals the package.json artifact descriptor", () => {
    expect(websiteArtifactsManifest).toEqual(pkg.cinatra.artifact);
  });
});
