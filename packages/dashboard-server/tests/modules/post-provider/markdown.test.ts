import { describe, expect, it } from "vitest";
import {
  stripMarkdown,
  stripMarkdownForBluesky,
} from "#utils/markdown.util.js";

describe("stripMarkdown", () => {
  it("expands links to text (url)", () => {
    expect(stripMarkdown("[click here](https://example.com)")).toBe(
      "click here (https://example.com)"
    );
  });

  it("strips bold markers", () => {
    expect(stripMarkdown("this is **bold** text")).toBe("this is bold text");
  });

  it("strips italic markers", () => {
    expect(stripMarkdown("this is *italic* text")).toBe("this is italic text");
  });

  it("handles mixed content", () => {
    expect(
      stripMarkdown("Hello **world** and *check* [this](https://x.com)!")
    ).toBe("Hello world and check this (https://x.com)!");
  });

  it("returns plain text unchanged", () => {
    const text = "No markdown here, just plain text.";
    expect(stripMarkdown(text)).toBe(text);
  });

  it("leaves bare URLs unchanged", () => {
    const text = "Visit https://example.com for more.";
    expect(stripMarkdown(text)).toBe(text);
  });

  it("handles bold containing italic", () => {
    expect(stripMarkdown("**bold *and italic***")).toBe("bold *and italic*");
  });

  it("handles multiple links", () => {
    expect(stripMarkdown("[a](https://a.com) and [b](https://b.com)")).toBe(
      "a (https://a.com) and b (https://b.com)"
    );
  });
});

describe("stripMarkdownForBluesky", () => {
  it("returns plain text with link facets for markdown links", () => {
    const result = stripMarkdownForBluesky(
      "Check [my site](https://example.com) out"
    );
    expect(result.text).toBe("Check my site out");
    expect(result.linkFacets).toEqual([
      { start: 6, end: 13, url: "https://example.com" },
    ]);
  });

  it("strips bold without creating facets", () => {
    const result = stripMarkdownForBluesky("this is **bold** text");
    expect(result.text).toBe("this is bold text");
    expect(result.linkFacets).toEqual([]);
  });

  it("strips italic without creating facets", () => {
    const result = stripMarkdownForBluesky("this is *italic* text");
    expect(result.text).toBe("this is italic text");
    expect(result.linkFacets).toEqual([]);
  });

  it("tracks correct positions after stripping earlier markdown", () => {
    const result = stripMarkdownForBluesky(
      "**bold** then [link](https://x.com)"
    );
    expect(result.text).toBe("bold then link");
    expect(result.linkFacets).toEqual([
      { start: 10, end: 14, url: "https://x.com" },
    ]);
  });

  it("handles multiple links with correct positions", () => {
    const result = stripMarkdownForBluesky(
      "[a](https://a.com) and [b](https://b.com)"
    );
    expect(result.text).toBe("a and b");
    expect(result.linkFacets).toEqual([
      { start: 0, end: 1, url: "https://a.com" },
      { start: 6, end: 7, url: "https://b.com" },
    ]);
  });

  it("returns plain text unchanged", () => {
    const text = "No markdown here.";
    const result = stripMarkdownForBluesky(text);
    expect(result.text).toBe(text);
    expect(result.linkFacets).toEqual([]);
  });

  it("preserves @mentions and #tags as-is", () => {
    const result = stripMarkdownForBluesky(
      "Hello @user.bsky.social and #melee"
    );
    expect(result.text).toBe("Hello @user.bsky.social and #melee");
    expect(result.linkFacets).toEqual([]);
  });
});
