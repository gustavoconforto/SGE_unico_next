import path from "node:path";
import { describe, expect, it } from "vitest";
import { MEDIA_ROOT, mediaPath } from "./media";

describe("mediaPath", () => {
  it("keeps stored names inside MEDIA_ROOT", () => {
    expect(mediaPath("students/a.jpg")).toBe(path.join(MEDIA_ROOT, "students/a.jpg"));
  });

  it("refuses names that escape it, including a sibling folder sharing its prefix", () => {
    for (const name of ["../x", "students/../../x", `../${path.basename(MEDIA_ROOT)}-other/x.jpg`, "/etc/passwd", "", "."])
      expect(() => mediaPath(name), name).toThrow("Invalid media path");
  });
});
