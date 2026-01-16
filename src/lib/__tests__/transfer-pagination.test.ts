import { expect, test } from "vitest";
import {
  DEFAULT_TRANSFER_LIMIT,
  getTransferLimit,
} from "@/lib/transferPagination";

test("getTransferLimit uses default when missing", () => {
  const params = new URLSearchParams();
  expect(getTransferLimit(params)).toBe(DEFAULT_TRANSFER_LIMIT);
});

test("getTransferLimit clamps to min/max", () => {
  expect(getTransferLimit(new URLSearchParams({ limit: "5" }))).toBe(10);
  expect(getTransferLimit(new URLSearchParams({ limit: "250" }))).toBe(100);
});
