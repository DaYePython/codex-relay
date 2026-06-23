import { describe, expect, it } from "vitest";
import { homedir } from "node:os";
import { join } from "node:path";

import {
  WORKSPACE_PREVIEW_OPEN_PROTOCOL,
  apiPaths,
  promptMarkdownWithSkills,
  WorkspacePreviewNavigationRequestSchema,
} from "../src/api-schema.js";
import * as apiSchema from "../src/api-schema.js";

const githubSkill = {
  name: "github",
  path: join(homedir(), ".codex/plugins/cache/openai-curated/github/skills/github/SKILL.md"),
};

const documentsSkill = {
  name: "documents",
  path: join(
    homedir(),
    ".codex/plugins/cache/openai-primary-runtime/documents/skills/documents/SKILL.md",
  ),
};

describe("promptMarkdownWithSkills", () => {
  it("preserves a skill mention before text", () => {
    expect(
      promptMarkdownWithSkills(`[$github](${githubSkill.path}) summarize this`, [githubSkill]),
    ).toBe(`[$github](${githubSkill.path}) summarize this`);
  });

  it("preserves multiple skill mentions in prompt order", () => {
    expect(
      promptMarkdownWithSkills(
        `[$github](${githubSkill.path}) hello [$documents](${documentsSkill.path})`,
        [githubSkill, documentsSkill],
      ),
    ).toBe(`[$github](${githubSkill.path}) hello [$documents](${documentsSkill.path})`);
  });

  it("converts plain selected skill tokens in place", () => {
    expect(promptMarkdownWithSkills("$github investigate", [githubSkill])).toBe(
      `[$github](${githubSkill.path}) investigate`,
    );
  });

  it("appends selected skills only when the prompt has no inline mention", () => {
    expect(promptMarkdownWithSkills("investigate", [githubSkill])).toBe(
      `investigate [$github](${githubSkill.path})`,
    );
  });
});

describe("WorkspacePreviewNavigationRequestSchema", () => {
  it("accepts a workspace preview markdown open request", () => {
    expect(
      WorkspacePreviewNavigationRequestSchema.parse({
        protocol: WORKSPACE_PREVIEW_OPEN_PROTOCOL,
        tab: "markdown",
        target: {
          name: "README.md",
          path: "README.md",
        },
        workspacePath: "/workspace/project",
      }),
    ).toEqual({
      protocol: WORKSPACE_PREVIEW_OPEN_PROTOCOL,
      tab: "markdown",
      target: {
        name: "README.md",
        path: "README.md",
      },
      workspacePath: "/workspace/project",
    });
  });

  it("rejects markdown open requests without a target", () => {
    expect(() =>
      WorkspacePreviewNavigationRequestSchema.parse({
        protocol: WORKSPACE_PREVIEW_OPEN_PROTOCOL,
        tab: "markdown",
      }),
    ).toThrow(/Invalid input/);
  });

  it("accepts a workspace preview SSH open request", () => {
    expect(
      WorkspacePreviewNavigationRequestSchema.parse({
        protocol: WORKSPACE_PREVIEW_OPEN_PROTOCOL,
        tab: "ssh",
        workspacePath: "/workspace/project",
      }),
    ).toEqual({
      protocol: WORKSPACE_PREVIEW_OPEN_PROTOCOL,
      tab: "ssh",
      workspacePath: "/workspace/project",
    });
  });
});

describe("WorkspaceTailscaleServe schemas", () => {
  it("exposes the workspace Tailscale Serve endpoint path", () => {
    expect(apiPaths.workspaceTailscaleServe).toBe("/v1/workspace/tailscale/serve");
  });

  it("accepts a request containing the workspace preview URL", () => {
    expect(
      apiSchema.WorkspaceTailscaleServeRequestSchema.parse({
        url: "http://100.103.76.81:3000/",
      }),
    ).toEqual({
      url: "http://100.103.76.81:3000/",
    });
  });

  it("accepts a response containing the Serve URL and preview port", () => {
    expect(
      apiSchema.WorkspaceTailscaleServeResponseSchema.parse({
        port: 3000,
        url: "https://device.tailnet.ts.net",
      }),
    ).toEqual({
      port: 3000,
      url: "https://device.tailnet.ts.net",
    });
  });
});
