import { fetchEtherscanPaginated } from "../sync";

test("fetchEtherscanPaginated paginates until short page", async () => {
  const calls: number[] = [];
  const fetchPage = async (params: URLSearchParams) => {
    calls.push(Number(params.get("page")));
    const page = Number(params.get("page"));
    if (page === 1) return ["a", "b"];
    if (page === 2) return ["c"];
    return [];
  };

  const result = await fetchEtherscanPaginated(
    new URLSearchParams({ module: "account", action: "txlist" }),
    "api-key",
    { pageSize: 2, maxPages: 5, fetchPage }
  );

  expect(result).toEqual(["a", "b", "c"]);
  expect(calls).toEqual([1, 2]);
});
