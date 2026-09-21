import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { DEFAULT_BRANDING } from "../src/lib/school-branding";

const root = new URL("../", import.meta.url);
const css = readFileSync(new URL("src/app/globals.css", root), "utf8");
const tokens = new Map(
  Array.from(css.matchAll(/--([a-z0-9-]+):\s*(#[a-f0-9]{6});/g), (match) => [
    match[1],
    match[2],
  ]),
);

test("light foundation retains the legacy palette and aligns brand defaults", () => {
  assert.equal(tokens.get("background"), "#edf2f9");
  assert.equal(tokens.get("card"), "#ffffff");
  assert.equal(tokens.get("foreground"), "#5e6e82");
  assert.equal(tokens.get("input"), "#99a0a8");
  assert.equal(tokens.get("primary"), DEFAULT_BRANDING.primaryColor);
  assert.equal(tokens.get("secondary"), DEFAULT_BRANDING.secondaryColor);
  assert.equal(tokens.get("accent"), DEFAULT_BRANDING.accentColor);
});

test("all four status palettes preserve exact legacy light surface, text and border colors", () => {
  const expected = {
    success: ["#ccf0e3", "#154e39", "#aee7d2"],
    warning: ["#fbecd2", "#60481e", "#f9e1b7"],
    info: ["#d3e8fb", "#3c5c78", "#b9dbf9"],
    danger: ["#fcdada", "#622a2a", "#fbc3c3"],
  };
  for (const [name, values] of Object.entries(expected)) {
    assert.deepEqual(
      [
        tokens.get(name),
        tokens.get(name + "-foreground"),
        tokens.get(name + "-border"),
      ],
      values,
    );
    for (const suffix of ["", "-foreground", "-border"]) {
      assert.ok(
        css.includes(
          "--color-" + name + suffix + ": var(--" + name + suffix + ");",
        ),
      );
    }
  }
});

function luminance(hex: string) {
  const values = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}

test("default body, brand button and status text pairs meet 4.5:1 contrast", () => {
  for (const [surface, text] of [
    ["background", "foreground"],
    ["card", "card-foreground"],
    ...[
      "primary",
      "secondary",
      "accent",
      "success",
      "warning",
      "info",
      "danger",
    ].map((name) => [name, name + "-foreground"]),
  ]) {
    const a = luminance(tokens.get(surface)!);
    const b = luminance(tokens.get(text)!);
    assert.ok(
      (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5,
      surface + " contrast",
    );
  }
});

test("the app has no dark theme selectors, media override or dark utilities", () => {
  assert.match(css, /color-scheme:\s*only light/);
  assert.doesNotMatch(
    css,
    /\.dark|@custom-variant dark|prefers-color-scheme:\s*dark/,
  );
  function inspect(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      if (entry.isDirectory()) inspect(file);
      else if (/\.(tsx|css)$/.test(entry.name)) {
        assert.doesNotMatch(
          readFileSync(file, "utf8"),
          /\bdark:|className="dark\b/,
          file,
        );
      }
    }
  }
  inspect(new URL("src", root).pathname);
});
