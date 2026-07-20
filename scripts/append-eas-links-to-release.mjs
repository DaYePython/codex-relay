#!/usr/bin/env node
/**
 * Append EAS Android build links to an existing GitHub Release body.
 *
 * Usage:
 *   node scripts/append-eas-links-to-release.mjs \
 *     --tag codex-relay@1.5.0 \
 *     --version 1.5.0 \
 *     --eas-json apps/mobile/eas-build-result.json
 *
 * Resolves the release tag with fallbacks when changesets uses a different
 * naming scheme (e.g. v1.5.0). Requires `gh` and GH_TOKEN / GITHUB_TOKEN.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function printUsageAndExit(exitCode = 1) {
  console.error(
    "Usage: node scripts/append-eas-links-to-release.mjs --tag <tag> --version <version> --eas-json <path>",
  );
  process.exit(exitCode);
}

function parseArgs(argv) {
  const options = {
    tag: "",
    version: "",
    easJson: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const nextValue = argv[index + 1];

    if (argument === "--tag" && nextValue) {
      options.tag = nextValue;
      index += 1;
      continue;
    }
    if (argument === "--version" && nextValue) {
      options.version = nextValue;
      index += 1;
      continue;
    }
    if (argument === "--eas-json" && nextValue) {
      options.easJson = nextValue;
      index += 1;
      continue;
    }
    if (argument === "--help" || argument === "-h") {
      printUsageAndExit(0);
    }

    console.error(`Unknown or incomplete argument: ${argument}`);
    printUsageAndExit(1);
  }

  if (!options.tag || !options.version || !options.easJson) {
    printUsageAndExit(1);
  }

  return options;
}

function runGh(args, options = {}) {
  const result = execFileSync("gh", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
  if (result == null) {
    return "";
  }
  return String(result).trim();
}

function tryGh(args) {
  try {
    return runGh(args);
  } catch {
    return null;
  }
}

function resolveReleaseTag(preferredTag, version) {
  const candidates = [
    preferredTag,
    `codex-relay@${version}`,
    `v${version}`,
    version,
  ].filter(Boolean);

  const uniqueCandidates = [...new Set(candidates)];

  for (const candidate of uniqueCandidates) {
    const result = tryGh([
      "release",
      "view",
      candidate,
      "--json",
      "tagName",
      "--jq",
      ".tagName",
    ]);
    if (result) {
      console.log(`Using GitHub release tag: ${result}`);
      return result;
    }
  }

  // Fall back to the most recent release whose tag or name mentions the version.
  const releaseListRaw = tryGh([
    "release",
    "list",
    "--limit",
    "20",
    "--json",
    "tagName,name",
  ]);

  if (releaseListRaw) {
    try {
      const releases = JSON.parse(releaseListRaw);
      const matchingRelease = releases.find((release) => {
        const tagName = release.tagName || "";
        const name = release.name || "";
        return tagName.includes(version) || name.includes(version);
      });
      if (matchingRelease?.tagName) {
        console.log(
          `Resolved release tag via recent releases list: ${matchingRelease.tagName}`,
        );
        return matchingRelease.tagName;
      }
    } catch (error) {
      console.error("Failed to parse gh release list output:", error);
    }
  }

  console.error(
    `Could not find a GitHub release for tag candidates: ${uniqueCandidates.join(", ")}`,
  );
  process.exit(1);
}

function parseJsonPayload(raw) {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // `eas build --json` may mix progress text with the final JSON payload.
    const firstArrayIndex = trimmed.indexOf("[");
    const firstObjectIndex = trimmed.indexOf("{");
    let startIndex = -1;
    if (firstArrayIndex === -1) {
      startIndex = firstObjectIndex;
    } else if (firstObjectIndex === -1) {
      startIndex = firstArrayIndex;
    } else {
      startIndex = Math.min(firstArrayIndex, firstObjectIndex);
    }

    if (startIndex === -1) {
      throw new Error("No JSON object or array found in EAS output");
    }

    const candidate = trimmed.slice(startIndex);
    for (let endIndex = candidate.length; endIndex > 0; endIndex -= 1) {
      try {
        return JSON.parse(candidate.slice(0, endIndex));
      } catch {
        // Keep shrinking until a trailing JSON value parses.
      }
    }

    throw new Error("Unable to extract JSON payload from EAS output");
  }
}

function extractBuildInfo(easJsonPath) {
  const raw = readFileSync(easJsonPath, "utf8").trim();
  let parsed;
  try {
    parsed = parseJsonPayload(raw);
  } catch (error) {
    console.error(`Failed to parse EAS JSON at ${easJsonPath}:`, error);
    process.exit(1);
  }

  const builds = Array.isArray(parsed) ? parsed : [parsed];
  const androidBuild =
    builds.find((build) => {
      const platform = String(build?.platform || "").toUpperCase();
      return platform === "ANDROID" || platform === "ANDROID_DEVICE";
    }) || builds[0];

  if (!androidBuild) {
    console.error("EAS JSON did not contain any builds:", raw);
    process.exit(1);
  }

  const buildId = androidBuild.id || "";
  const status = androidBuild.status || "unknown";
  const artifactUrl =
    androidBuild.artifacts?.buildUrl ||
    androidBuild.artifacts?.applicationArchiveUrl ||
    "";
  const buildPageUrl =
    androidBuild.buildDetailsPageUrl ||
    (buildId
      ? `https://expo.dev/accounts/daye2026/projects/codex-relay-android/builds/${buildId}`
      : "");

  if (String(status).toUpperCase() !== "FINISHED" && !artifactUrl) {
    console.error(
      `EAS build did not finish successfully (status=${status}). Full JSON:\n${raw}`,
    );
    process.exit(1);
  }

  return {
    buildId,
    status,
    artifactUrl,
    buildPageUrl,
  };
}

function buildMobileSection({ version, buildPageUrl, artifactUrl, buildId }) {
  const lines = [
    "## Mobile builds",
    "",
    `- App version: \`${version}\``,
    `- Platform: Android (EAS profile \`preview\`, APK)`,
  ];

  if (buildPageUrl) {
    lines.push(`- EAS build page: ${buildPageUrl}`);
  }
  if (artifactUrl) {
    lines.push(`- Artifact download: ${artifactUrl}`);
  }
  if (buildId) {
    lines.push(`- Build id: \`${buildId}\``);
  }

  lines.push("");
  return lines.join("\n");
}

function stripExistingMobileSection(body) {
  const marker = "## Mobile builds";
  const markerIndex = body.indexOf(marker);
  if (markerIndex === -1) {
    return body.replace(/\s*$/, "");
  }
  return body.slice(0, markerIndex).replace(/\s*$/, "");
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const releaseTag = resolveReleaseTag(options.tag, options.version);
  const buildInfo = extractBuildInfo(options.easJson);

  const existingBody = runGh([
    "release",
    "view",
    releaseTag,
    "--json",
    "body",
    "--jq",
    ".body // \"\"",
  ]);

  const baseBody = stripExistingMobileSection(existingBody || "");
  const mobileSection = buildMobileSection({
    version: options.version,
    buildPageUrl: buildInfo.buildPageUrl,
    artifactUrl: buildInfo.artifactUrl,
    buildId: buildInfo.buildId,
  });

  const nextBody = baseBody
    ? `${baseBody}\n\n${mobileSection}`
    : mobileSection;

  const temporaryDirectory = mkdtempSync(join(tmpdir(), "codex-relay-release-"));
  const notesPath = join(temporaryDirectory, "notes.md");
  writeFileSync(notesPath, nextBody, "utf8");

  runGh(["release", "edit", releaseTag, "--notes-file", notesPath], {
    stdio: "inherit",
  });

  console.log(`Updated GitHub release ${releaseTag} with EAS Android links.`);
  if (buildInfo.buildPageUrl) {
    console.log(`Build page: ${buildInfo.buildPageUrl}`);
  }
  if (buildInfo.artifactUrl) {
    console.log(`Artifact: ${buildInfo.artifactUrl}`);
  }
}

main();
