// @vitest-environment node
// The website pack (cinatra#4366): it owns the page snapshot type and the one
// page renderer that draws it, and nothing else. The typed export mirrors
// package.json.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  PAGE_DIFF_RENDERER,
  PAGE_SNAPSHOT_MIME,
  PAGE_SNAPSHOT_OBJECT_TYPE,
  parseCmsPage,
  websiteArtifactsManifest,
} from "../src/index";
import { PAGE_FORMS } from "./cms-page-fixture";

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"),
) as {
  name: string;
  license: string;
  files: string[];
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  exports: Record<string, string>;
  cinatra: {
    kind: string;
    apiVersion: string;
    displayName: string;
    vendor: { key: string; name: string };
    dependencies: unknown[];
    artifact: {
      accepts: { file: { mimeTypes: string[] } };
      ui: {
        abiVersion: number;
        sdkAbiRange: string;
        renderers: Record<string, { entry: string; propsApiVersion: number; representations?: string[] }>;
      };
      objectTypes: Array<{ type: string; claim: string; dispositions: unknown; schema: unknown }>;
    };
  };
};

/** The package that registers a type: the namespace of its id (`@scope/pkg:slug`
 * registers under `@scope/pkg`), as the host reads it. */
function registeringPackage(type: string): string | null {
  const index = type.indexOf(":");
  return index > 0 ? type.slice(0, index) : null;
}

/** The claim set this pack may carry, exactly. Anything else is refused here. */
const ALLOWED_CLAIMS = ["@cinatra-ai/website-artifacts:page-snapshot"];

describe("manifest — the website pack", () => {
  it("names the pack per the plural kind convention (@cinatra-ai/<slug>-artifacts)", () => {
    expect(pkg.name).toBe("@cinatra-ai/website-artifacts");
    expect(pkg.cinatra.kind).toBe("artifact");
    expect(pkg.cinatra.apiVersion).toBe("cinatra.ai/v1");
    expect(pkg.license).toBe("Apache-2.0");
  });

  it("carries the kind label the drawing gives the page", () => {
    expect(pkg.cinatra.displayName).toBe("CMS page");
    expect(pkg.cinatra.vendor).toEqual({ key: "cinatra-ai", name: "Cinatra" });
  });

  it("accepts the page content form as JSON", () => {
    expect(PAGE_SNAPSHOT_MIME).toBe("application/json");
    expect(pkg.cinatra.artifact.accepts).toEqual({ file: { mimeTypes: [PAGE_SNAPSHOT_MIME] } });
    for (const fixture of PAGE_FORMS) expect(parseCmsPage(JSON.stringify(fixture.form)).ok).toBe(true);
  });

  it("declares exactly one type, the pinnable page snapshot", () => {
    expect(PAGE_SNAPSHOT_OBJECT_TYPE).toBe("@cinatra-ai/website-artifacts:page-snapshot");
    expect(pkg.cinatra.artifact.objectTypes).toEqual([
      {
        type: PAGE_SNAPSHOT_OBJECT_TYPE,
        claim: "dedicated",
        dispositions: { projection: "artifact-safe", pinnable: true, snapshotPolicy: "none", sensitivity: "normal" },
        schema: { type: "object" },
      },
    ]);
  });

  it("owns its type in its own namespace, so the host registers it under this package", () => {
    for (const { type } of pkg.cinatra.artifact.objectTypes) {
      expect(registeringPackage(type), type).toBe(pkg.name);
    }
  });

  it("carries exactly the allowed claim set and refuses any other target", () => {
    const declared = pkg.cinatra.artifact.objectTypes.map((entry) => entry.type);
    expect(declared).toEqual(ALLOWED_CLAIMS);
    for (const refused of [
      "@cinatra-ai/cms-snapshot-artifact:cms-page",
      "@cinatra-ai/objects:cms-content-snapshot",
      "@cinatra-ai/website-artifacts:page-diff",
    ]) {
      expect(declared, refused).not.toContain(refused);
    }
  });

  it("names its one renderer apart from its type", () => {
    expect(PAGE_DIFF_RENDERER).toBe("@cinatra-ai/website-artifacts:page-diff");
    expect(PAGE_DIFF_RENDERER).not.toBe(PAGE_SNAPSHOT_OBJECT_TYPE);
    expect(registeringPackage(PAGE_DIFF_RENDERER)).toBe(pkg.name);
  });

  it("ships a detail and a list-row display and no preview", () => {
    const renderers = pkg.cinatra.artifact.ui.renderers;
    expect(Object.keys(renderers).sort()).toEqual(["detail", "listRow"]);
    expect(renderers.detail).toEqual({ entry: "./src/renderers/detail.tsx", propsApiVersion: 5 });
    expect(renderers.preview).toBeUndefined();
    expect(pkg.exports["./src/renderers/detail"]).toBe("./src/renderers/detail.tsx");
    expect(pkg.exports["./src/renderers/preview"]).toBeUndefined();
  });

  it("depends on no other extension and on no first-party package", () => {
    expect(pkg.cinatra.dependencies).toEqual([]);
    const firstParty = (deps: Record<string, string> | undefined): string[] =>
      Object.keys(deps ?? {}).filter((name) => name.startsWith("@cinatra-ai/") || name.startsWith("@cinatra/"));
    expect(firstParty(pkg.dependencies)).toEqual([]);
    expect(firstParty(pkg.peerDependencies)).toEqual([]);
  });

  it("the typed manifest equals the package.json artifact descriptor", () => {
    expect(websiteArtifactsManifest).toEqual(pkg.cinatra.artifact);
  });
});
