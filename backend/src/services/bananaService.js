const DEFAULT_URL = "http://marcconrad.com/uob/banana/api.php?out=json";
const UNAVAILABLE_MESSAGE =
  "The quiz service is temporarily unavailable. Please try again later.";
const RETRYABLE_HTTP = new Set([408, 429, 500, 502, 503, 504]);

/**
 * Isolated Banana API adapter.
 * Banana Game API: Marc Conrad, https://marcconrad.com/uob/banana/doc.php
 *
 * External JSON: { "question": "<image url or base64>", "solution": <number> }
 * Internal puzzle: { question, solution }
 *
 * The solution stays inside this process. Callers must not send it to the browser.
 * A failed request is never replaced with a hardcoded puzzle.
 */
function createBananaService({
  url = DEFAULT_URL,
  fetchFn = fetch,
  timeoutMs = 10000,
  logger = console,
} = {}) {
  function toInternalPuzzle(data) {
    const question = data && typeof data.question === "string" ? data.question.trim() : "";
    const solution = Number(data && data.solution);
    if (!question || !Number.isInteger(solution) || solution < 0 || solution > 9) {
      const error = new Error("Banana API returned incomplete puzzle data");
      error.code = "BANANA_MALFORMED";
      throw error;
    }
    return { question, solution };
  }

  async function requestOnce() {
    let response;
    try {
      response = await fetchFn(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      const timedOut =
        error &&
        (error.name === "TimeoutError" ||
          error.name === "AbortError" ||
          error.code === "ABORT_ERR");
      const wrapped = new Error(
        timedOut ? "Banana API timed out" : "Banana API network failure"
      );
      wrapped.code = timedOut ? "BANANA_TIMEOUT" : "BANANA_NETWORK";
      wrapped.cause = error;
      throw wrapped;
    }

    if (!response.ok) {
      const error = new Error("Banana API request failed");
      error.code = "BANANA_HTTP";
      error.status = response.status;
      throw error;
    }

    let data;
    try {
      data = await response.json();
    } catch (error) {
      const wrapped = new Error("Banana API returned invalid JSON");
      wrapped.code = "BANANA_MALFORMED";
      wrapped.cause = error;
      throw wrapped;
    }

    return toInternalPuzzle(data);
  }

  function isRetryable(error) {
    if (!error) {
      return false;
    }
    if (error.code === "BANANA_NETWORK" || error.code === "BANANA_TIMEOUT") {
      return true;
    }
    return error.code === "BANANA_HTTP" && RETRYABLE_HTTP.has(error.status);
  }

  async function fetchPuzzle() {
    try {
      return await requestOnce();
    } catch (error) {
      if (!isRetryable(error)) {
        throw error;
      }
      logger.error(
        `Banana API temporary failure (${error.code}${
          error.status ? ` ${error.status}` : ""
        }). Retrying once.`
      );
      return requestOnce();
    }
  }

  return { fetchPuzzle };
}

function publicBananaError(error, logger = console) {
  logger.error("Banana API failure", {
    code: error && error.code,
    status: error && error.status,
    message: error && error.message,
  });

  if (
    error &&
    (error.code === "BANANA_NETWORK" ||
      error.code === "BANANA_TIMEOUT" ||
      error.code === "BANANA_HTTP" ||
      error.code === "BANANA_MALFORMED")
  ) {
    return {
      status: error.code === "BANANA_NETWORK" || error.code === "BANANA_TIMEOUT" ? 503 : 502,
      message: UNAVAILABLE_MESSAGE,
    };
  }

  return {
    status: 500,
    message: "An unexpected error occurred while loading a puzzle.",
  };
}

module.exports = {
  createBananaService,
  publicBananaError,
  DEFAULT_URL,
  UNAVAILABLE_MESSAGE,
};
