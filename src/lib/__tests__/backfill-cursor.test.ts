import { buildBackfillWhere } from "../backfill";

test("buildBackfillWhere adds cursor filter when provided", () => {
  const base = buildBackfillWhere("user-1", null);
  const withCursor = buildBackfillWhere("user-1", "cursor-id");

  expect(base).toMatchObject({ userId: "user-1" });
  expect(withCursor).toMatchObject({
    userId: "user-1",
    id: { gt: "cursor-id" },
  });
});
