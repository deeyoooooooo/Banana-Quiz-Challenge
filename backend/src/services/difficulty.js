/**
 * Central difficulty configuration for Banana Arcade.
 * Scoring, timers, and hints must be read from here on the server.
 * The frontend may display these values, but it cannot decide the official score.
 */
const DIFFICULTIES = {
  easy: {
    id: "easy",
    name: "Easy",
    tagline: "Relax and Practice",
    description: "No timer, a gentle pace, and an optional even/odd hint.",
    timeLimit: null,
    pointsPerCorrectAnswer: 10,
    hintsEnabled: true,
  },
  medium: {
    id: "medium",
    name: "Medium",
    tagline: "Challenge Yourself",
    description: "A 30-second limit per puzzle. No hints.",
    timeLimit: 30,
    pointsPerCorrectAnswer: 20,
    hintsEnabled: false,
  },
  difficult: {
    id: "difficult",
    name: "Difficult",
    tagline: "Test Your Skills",
    description: "A 15-second limit per puzzle. No hints.",
    timeLimit: 15,
    pointsPerCorrectAnswer: 30,
    hintsEnabled: false,
  },
};

function parseDifficulty(raw) {
  if (raw === undefined || raw === null || raw === "") {
    return { value: "easy" };
  }
  const key = String(raw).trim().toLowerCase();
  if (!DIFFICULTIES[key]) {
    return {
      error: "Choose Easy, Medium, or Difficult.",
    };
  }
  return { value: key };
}

function getDifficulty(id) {
  return DIFFICULTIES[id];
}

function maxScoreFor(id, questionsPerQuiz) {
  return DIFFICULTIES[id].pointsPerCorrectAnswer * questionsPerQuiz;
}

function publicDifficulties(questionsPerQuiz) {
  return Object.values(DIFFICULTIES).map((item) => ({
    id: item.id,
    name: item.name,
    tagline: item.tagline,
    description: item.description,
    timeLimit: item.timeLimit,
    pointsPerCorrectAnswer: item.pointsPerCorrectAnswer,
    hintsEnabled: item.hintsEnabled,
    questions: questionsPerQuiz,
    maxScore: maxScoreFor(item.id, questionsPerQuiz),
  }));
}

module.exports = {
  DIFFICULTIES,
  parseDifficulty,
  getDifficulty,
  maxScoreFor,
  publicDifficulties,
};
