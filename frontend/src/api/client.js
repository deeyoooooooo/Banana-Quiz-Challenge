async function request(path, options = {}) {
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  let response;
  try {
    response = await fetch(path, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch (error) {
    const networkError = new Error(
      "Network failure. Check that the backend is running and you are online."
    );
    networkError.cause = error;
    throw networkError;
  }

  let data = {};
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: "The server returned an unexpected response." };
    }
  }

  if (!response.ok) {
    const error = new Error(data.error || "Request failed.");
    error.status = response.status;
    error.details = data.details;
    Object.assign(error, data);
    throw error;
  }

  return data;
}

export const api = {
  getCsrfToken() {
    return request("/api/auth/csrf-token");
  },
  register(payload, csrfToken) {
    return request("/api/auth/register", {
      method: "POST",
      headers: { "x-csrf-token": csrfToken },
      body: JSON.stringify(payload),
    });
  },
  login(payload, csrfToken) {
    return request("/api/auth/login", {
      method: "POST",
      headers: { "x-csrf-token": csrfToken },
      body: JSON.stringify(payload),
    });
  },
  logout(csrfToken) {
    return request("/api/auth/logout", {
      method: "POST",
      headers: { "x-csrf-token": csrfToken },
    });
  },
  me() {
    return request("/api/auth/me");
  },
  startQuiz(csrfToken) {
    return request("/api/quiz/start", {
      method: "POST",
      headers: { "x-csrf-token": csrfToken },
    });
  },
  currentQuiz() {
    return request("/api/quiz/current");
  },
  retryPuzzle(csrfToken) {
    return request("/api/quiz/retry", {
      method: "POST",
      headers: { "x-csrf-token": csrfToken },
    });
  },
  submitAnswer(answer, csrfToken) {
    return request("/api/quiz/answer", {
      method: "POST",
      headers: { "x-csrf-token": csrfToken },
      body: JSON.stringify({ answer }),
    });
  },
  listResults() {
    return request("/api/quiz/results");
  },
  getResult(id) {
    return request(`/api/quiz/results/${id}`);
  },
};
