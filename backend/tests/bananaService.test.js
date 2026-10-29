const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createBananaService } = require("../src/services/bananaService");

test("parses a successful Banana API JSON response", async () => {
  const service = createBananaService({
    fetchFn: async () => ({
      ok: true,
      json: async () => ({
        question: "https://www.sanfoh.com/uob/banana/data/example.png",
        solution: 2,
      }),
    }),
  });

  const puzzle = await service.fetchPuzzle();
  assert.equal(
    puzzle.question,
    "https://www.sanfoh.com/uob/banana/data/example.png"
  );
  assert.equal(puzzle.solution, 2);
});

test("fails clearly when the Banana API is unreachable", async () => {
  const service = createBananaService({
    fetchFn: async () => {
      throw new Error("fetch failed");
    },
  });

  await assert.rejects(() => service.fetchPuzzle(), (error) => {
    assert.equal(error.code, "BANANA_NETWORK");
    return true;
  });
});

test("fails when the Banana API returns malformed data", async () => {
  const service = createBananaService({
    fetchFn: async () => ({
      ok: true,
      json: async () => ({ hello: "world" }),
    }),
  });

  await assert.rejects(() => service.fetchPuzzle(), (error) => {
    assert.equal(error.code, "BANANA_MALFORMED");
    return true;
  });
});

test("fails when the Banana API returns a non-success HTTP status", async () => {
  const service = createBananaService({
    fetchFn: async () => ({
      ok: false,
      status: 500,
    }),
  });

  await assert.rejects(() => service.fetchPuzzle(), (error) => {
    assert.equal(error.code, "BANANA_HTTP");
    return true;
  });
});
