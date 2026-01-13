import { expect, test } from "vitest";
import { decodeCursor, encodeCursor } from "@/lib/pagination";

test("encode/decode cursor roundtrip", () => {
  const cursor = encodeCursor({ id: "t1", ts: 123 });
  const decoded = decodeCursor(cursor);
  expect(decoded).toEqual({ id: "t1", ts: 123 });
});
