const DEFAULT_URL = "http://marcconrad.com/uob/banana/api.php?out=json";

/**
 * Isolated Banana API client.
 * Banana Game API: Marc Conrad, https://marcconrad.com/uob/banana/doc.php
 * Documentation: https://marcconrad.com/uob/banana/doc.php
 *
 * The documented JSON response contains:
 *   { "question": "<image url or base64>", "solution": <number> }
 *
 * This service never invents extra fields. Callers must keep `solution`
 * on the server and must not treat a mock as a live API response.
 */
function createBananaService({
  url = DEFAULT_URL,
  fetchFn = fetch,
  timeoutMs = 10000,
} = {}) {
  async function fetchPuzzle() {
    let response;
    try {
      response = await fetchFn(url, {
        method: "GET",
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      const wrapped = new Error("Banana API network failure");
      wrapped.code = "BANANA_NETWORK";
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

    const question = data && data.question;
    const solution = Number(data && data.solution);

    if (!question || Number.isNaN(solution)) {
      const error = new Error("Banana API returned incomplete puzzle data");
      error.code = "BANANA_MALFORMED";
      throw error;
    }

    return { question, solution };
  }

  return { fetchPuzzle };
}

function publicBananaError(error) {
  if (error && error.code === "BANANA_NETWORK") {
    return {
      status: 503,
      message: "Could not reach the Banana API. Check your network connection and try again.",
    };
  }
  if (error && error.code === "BANANA_HTTP") {
    return {
      status: 502,
      message: "The Banana API did not return a successful response. Please retry.",
    };
  }
  if (error && error.code === "BANANA_MALFORMED") {
    return {
      status: 502,
      message: "The Banana API returned missing or malformed puzzle data. Please retry.",
    };
  }
  return {
    status: 500,
    message: "An unexpected error occurred while loading a puzzle.",
  };
}

module.exports = { createBananaService, publicBananaError, DEFAULT_URL };
