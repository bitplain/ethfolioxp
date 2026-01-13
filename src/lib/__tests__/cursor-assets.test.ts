import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const cursorPath = path.join(root, "public/cursors/xp-text.cur");
const cssPath = path.join(root, "src/app/globals.css");

test("xp text cursor asset is present", () => {
  expect(fs.existsSync(cursorPath)).toBe(true);
});

test("globals.css applies xp text cursor to text inputs", () => {
  const css = fs.readFileSync(cssPath, "utf8");
  expect(css).toContain('--cursor-text: url("/cursors/xp-text.cur")');
  expect(css).toContain("cursor: var(--cursor-text");
});
