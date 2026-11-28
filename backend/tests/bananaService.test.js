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
  let calls = 0;
  const service = createBananaService({
    fetchFn: async () => {
      calls += 1;
      return { ok: false, status: 404 };
    },
  });

  await assert.rejects(() => service.fetchPuzzle(), (error) => {
    assert.equal(error.code, "BANANA_HTTP");
    assert.equal(error.status, 404);
    return true;
  });
  assert.equal(calls, 1);
});

test("retries once after a timeout and then returns the puzzle", async () => {
  let calls = 0;
  const service = createBananaService({
    logger: { error() {} },
    fetchFn: async () => {
      calls += 1;
      if (calls === 1) {
        const error = new Error("The operation was aborted due to timeout");
        error.name = "TimeoutError";
        throw error;
      }
      return {
        ok: true,
        json: async () => ({
          question: "http://marcconrad.com/uob/banana/example.png",
          solution: 8,
        }),
      };
    },
  });

  const puzzle = await service.fetchPuzzle();
  assert.equal(calls, 2);
  assert.equal(puzzle.question, "http://marcconrad.com/uob/banana/example.png");
  assert.equal(puzzle.solution, 8);
});

test("retries a temporary HTTP failure only once", async () => {
  let calls = 0;
  const service = createBananaService({
    logger: { error() {} },
    fetchFn: async () => {
      calls += 1;
      return { ok: false, status: 503 };
    },
  });

  await assert.rejects(() => service.fetchPuzzle(), (error) => {
    assert.equal(error.code, "BANANA_HTTP");
    assert.equal(error.status, 503);
    return true;
  });
  assert.equal(calls, 2);
});

test("does not retry a malformed Banana API response", async () => {
  let calls = 0;
  const service = createBananaService({
    fetchFn: async () => {
      calls += 1;
      return { ok: true, json: async () => ({ question: "", solution: 3 }) };
    },
  });

  await assert.rejects(() => service.fetchPuzzle(), (error) => {
    assert.equal(error.code, "BANANA_MALFORMED");
    return true;
  });
  assert.equal(calls, 1);
});
