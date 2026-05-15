import { describe, expect, it } from "vitest";
import { homedir } from "node:os";
import { join } from "node:path";

import {
  WORKSPACE_PREVIEW_OPEN_PROTOCOL,
  promptMarkdownWithSkills,
  WorkspacePreviewNavigationRequestSchema,
} from "../src/api-schema.js";

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
