const express = require("express");
const { requireAuth } = require("../middleware/requireAuth");
const { parseAnswer } = require("../services/validation");
const { publicBananaError } = require("../services/bananaService");
const {
  parseDifficulty,
  getDifficulty,
  maxScoreFor,
  publicDifficulties,
} = require("../services/difficulty");

function remainingMs(quiz, now) {
  if (!quiz.current || quiz.current.deadlineAt == null) {
    return null;
  }
  return Math.max(0, quiz.current.deadlineAt - now());
}

function publicPuzzle(quiz, now) {
  return {
    question: quiz.current.question,
    questionNumber: quiz.questionNumber,
    totalQuestions: quiz.totalQuestions,
    score: quiz.score,
    answered: quiz.answered,
    difficulty: quiz.difficulty,
    timeLimit: quiz.timeLimit,
    remainingMs: remainingMs(quiz, now),
    serverDeadline: quiz.current.deadlineAt,
    hintsEnabled: quiz.hintsEnabled,
    hintAvailable: Boolean(quiz.hintsEnabled && quiz.current && !quiz.current.hintUsed),
    maxScore: quiz.maxScore,
    pointsPerCorrectAnswer: quiz.pointsPerCorrectAnswer,
  };
}

function publicResultFields(quiz) {
  return {
    score: quiz.score,
    answered: quiz.answered,
    totalQuestions: quiz.totalQuestions,
    difficulty: quiz.difficulty,
    maxScore: quiz.maxScore,
    correctCount: quiz.correctCount,
    incorrectCount: quiz.incorrectCount,
    unansweredCount: quiz.unansweredCount,
  };
}

async function loadPuzzle(bananaService, quiz, now) {
  const puzzle = await bananaService.fetchPuzzle();
  const startedAt = now();
  quiz.current = {
    question: puzzle.question,
    solution: puzzle.solution,
    startedAt,
    deadlineAt:
      quiz.timeLimit == null ? null : startedAt + quiz.timeLimit * 1000,
    hintUsed: false,
    resolved: false,
  };
}

function isExpired(quiz, now) {
  return Boolean(
    quiz.current &&
      quiz.current.deadlineAt != null &&
      now() > quiz.current.deadlineAt
  );
}

function saveCompletedResult(db, userId, quiz) {
  const createdAt = new Date().toISOString();
  return db
    .prepare(
      `INSERT INTO quiz_results (
         user_id, score, total_questions, created_at,
         difficulty, max_score, correct_count, incorrect_count, unanswered_count
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      userId,
      quiz.score,
      quiz.totalQuestions,
      createdAt,
      quiz.difficulty,
      quiz.maxScore,
      quiz.correctCount,
      quiz.incorrectCount,
      quiz.unansweredCount
    );
}

function mapResultRow(row) {
  return {
    id: row.id,
    score: row.score,
    totalQuestions: row.totalQuestions,
    createdAt: row.createdAt,
    difficulty: row.difficulty,
    maxScore: row.maxScore,
    correctCount: row.correctCount,
    incorrectCount: row.incorrectCount,
    unansweredCount: row.unansweredCount,
    accuracy:
      row.totalQuestions > 0
        ? Math.round((row.correctCount / row.totalQuestions) * 100)
        : 0,
  };
}

function computeStats(rows) {
  const totalQuizzes = rows.length;
  if (!totalQuizzes) {
    return {
      totalQuizzes: 0,
      bestScore: null,
      averageScore: null,
      byDifficulty: {
        easy: { count: 0, bestScore: null, averageScore: null },
        medium: { count: 0, bestScore: null, averageScore: null },
        difficult: { count: 0, bestScore: null, averageScore: null },
      },
    };
  }

  const sum = rows.reduce((total, row) => total + row.score, 0);
  const byDifficulty = {};
  for (const key of ["easy", "medium", "difficult"]) {
    const group = rows.filter((row) => row.difficulty === key);
    byDifficulty[key] = {
      count: group.length,
      bestScore: group.length ? Math.max(...group.map((row) => row.score)) : null,
      averageScore: group.length
        ? Math.round(
            (group.reduce((total, row) => total + row.score, 0) / group.length) *
              10
          ) / 10
        : null,
    };
  }

  return {
    totalQuizzes,
    bestScore: Math.max(...rows.map((row) => row.score)),
    averageScore: Math.round((sum / totalQuizzes) * 10) / 10,
    byDifficulty,
  };
}

function createQuizRouter({ db, bananaService, questionsPerQuiz, now = () => Date.now() }) {
  const router = express.Router();

  router.get("/difficulties", (req, res) => {
    return res.json({
      difficulties: publicDifficulties(questionsPerQuiz),
    });
  });

  router.use(requireAuth);

  async function advanceAfterQuestion(req, res, quiz, extra) {
    if (quiz.answered >= quiz.totalQuestions) {
      quiz.completed = true;
      quiz.current = null;
      try {
        const result = saveCompletedResult(db, req.session.user.id, quiz);
        req.session.quiz = quiz;
        return res.json({
          ...extra,
          completed: true,
          resultId: result.lastInsertRowid,
          ...publicResultFields(quiz),
        });
      } catch (error) {
        quiz.completed = true;
        req.session.quiz = quiz;
        return res.status(500).json({
          error: "Your answers were scored, but the result could not be saved.",
          ...extra,
          completed: true,
          ...publicResultFields(quiz),
        });
      }
    }

    quiz.questionNumber += 1;
    try {
      await loadPuzzle(bananaService, quiz, now);
    } catch (error) {
      req.session.quiz = quiz;
      const mapped = publicBananaError(error);
      return res.status(mapped.status).json({
        error: mapped.message,
        ...extra,
        completed: false,
        needsRetry: true,
        ...publicResultFields(quiz),
      });
    }

    req.session.quiz = quiz;
    return res.json({
      ...extra,
      completed: false,
      puzzle: publicPuzzle(quiz, now),
      ...publicResultFields(quiz),
    });
  }

  function applyTimeout(quiz) {
    quiz.unansweredCount += 1;
    quiz.answered += 1;
    quiz.current = null;
  }

  router.post("/start", async (req, res) => {
    const parsed = parseDifficulty(req.body && req.body.difficulty);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    const rules = getDifficulty(parsed.value);
    const quiz = {
      difficulty: rules.id,
      timeLimit: rules.timeLimit,
      pointsPerCorrectAnswer: rules.pointsPerCorrectAnswer,
      hintsEnabled: rules.hintsEnabled,
      maxScore: maxScoreFor(rules.id, questionsPerQuiz),
      score: 0,
      answered: 0,
      correctCount: 0,
      incorrectCount: 0,
      unansweredCount: 0,
      questionNumber: 1,
      totalQuestions: questionsPerQuiz,
      current: null,
      completed: false,
    };

    try {
      await loadPuzzle(bananaService, quiz, now);
    } catch (error) {
      const mapped = publicBananaError(error);
      return res.status(mapped.status).json({ error: mapped.message });
    }

    req.session.quiz = quiz;
    return res.json({
      message: "Quiz started.",
      puzzle: publicPuzzle(quiz, now),
    });
  });

  router.get("/current", (req, res) => {
    const quiz = req.session.quiz;
    if (!quiz || quiz.completed || !quiz.current) {
      return res.status(404).json({
        error: "No active quiz. Start a new quiz from the dashboard.",
      });
    }
    return res.json({
      puzzle: publicPuzzle(quiz, now),
      expired: isExpired(quiz, now),
    });
  });

  router.post("/retry", async (req, res) => {
    const quiz = req.session.quiz;
    if (!quiz || quiz.completed) {
      return res.status(404).json({
        error: "No active quiz. Start a new quiz from the dashboard.",
      });
    }

    try {
      await loadPuzzle(bananaService, quiz, now);
    } catch (error) {
      const mapped = publicBananaError(error);
      return res.status(mapped.status).json({ error: mapped.message });
    }

    return res.json({
      message: "Puzzle loaded.",
      puzzle: publicPuzzle(quiz, now),
    });
  });

  router.post("/hint", (req, res) => {
    const quiz = req.session.quiz;
    if (!quiz || quiz.completed || !quiz.current) {
      return res.status(404).json({
        error: "No active quiz. Start a new quiz from the dashboard.",
      });
    }
    if (!quiz.hintsEnabled) {
      return res.status(403).json({
        error: "Hints are not available on this difficulty.",
      });
    }
    if (isExpired(quiz, now)) {
      return res.status(400).json({
        error: "Time ran out for this question.",
        timedOut: true,
      });
    }

    const even = Number(quiz.current.solution) % 2 === 0;
    quiz.current.hintUsed = true;
    req.session.quiz = quiz;
    return res.json({
      hint: even
        ? "The hidden number is even."
        : "The hidden number is odd.",
      hintAvailable: false,
    });
  });

  router.post("/timeout", async (req, res) => {
    const quiz = req.session.quiz;
    if (!quiz || quiz.completed || !quiz.current) {
      return res.status(404).json({
        error: "No active quiz. Start a new quiz from the dashboard.",
      });
    }
    if (quiz.current.resolved) {
      return res.status(409).json({
        error: "This question has already been submitted.",
      });
    }
    if (!isExpired(quiz, now)) {
      return res.status(400).json({
        error: "This question still has time remaining.",
        remainingMs: remainingMs(quiz, now),
      });
    }

    quiz.current.resolved = true;
    applyTimeout(quiz);
    return advanceAfterQuestion(req, res, quiz, {
      timedOut: true,
      correct: false,
    });
  });

  router.post("/abandon", (req, res) => {
    req.session.quiz = null;
    return res.json({ message: "Quiz ended without saving a result." });
  });

  router.post("/answer", async (req, res) => {
    const quiz = req.session.quiz;
    if (!quiz || quiz.completed || !quiz.current) {
      return res.status(404).json({
        error: "No active quiz. Start a new quiz from the dashboard.",
      });
    }
    if (quiz.current.resolved) {
      return res.status(409).json({
        error: "This question has already been submitted.",
      });
    }

    if (isExpired(quiz, now)) {
      quiz.current.resolved = true;
      applyTimeout(quiz);
      return advanceAfterQuestion(req, res, quiz, {
        timedOut: true,
        correct: false,
        error: "Time ran out for this question.",
      });
    }

    const parsed = parseAnswer(req.body && req.body.answer);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    quiz.current.resolved = true;
    const correct = parsed.answer === Number(quiz.current.solution);
    if (correct) {
      quiz.score += quiz.pointsPerCorrectAnswer;
      quiz.correctCount += 1;
    } else {
      quiz.incorrectCount += 1;
    }
    quiz.answered += 1;
    quiz.current = null;

    return advanceAfterQuestion(req, res, quiz, { correct, timedOut: false });
  });

  router.get("/results", (req, res) => {
    try {
      const rows = db
        .prepare(
          `SELECT
             id,
             score,
             total_questions AS totalQuestions,
             created_at AS createdAt,
             difficulty,
             max_score AS maxScore,
             correct_count AS correctCount,
             incorrect_count AS incorrectCount,
             unanswered_count AS unansweredCount
           FROM quiz_results
           WHERE user_id = ?
           ORDER BY id DESC`
        )
        .all(req.session.user.id)
        .map(mapResultRow);

      return res.json({
        results: rows,
        stats: computeStats(rows),
      });
    } catch (error) {
      return res.status(500).json({
        error: "Could not load quiz history. Please try again.",
      });
    }
  });

  router.get("/results/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Invalid result id." });
    }

    try {
      const row = db
        .prepare(
          `SELECT
             id,
             score,
             total_questions AS totalQuestions,
             created_at AS createdAt,
             difficulty,
             max_score AS maxScore,
             correct_count AS correctCount,
             incorrect_count AS incorrectCount,
             unanswered_count AS unansweredCount
           FROM quiz_results
           WHERE id = ? AND user_id = ?`
        )
        .get(id, req.session.user.id);

      if (!row) {
        return res.status(404).json({
          error: "Result not found.",
        });
      }
      return res.json({ result: mapResultRow(row) });
    } catch (error) {
      return res.status(500).json({
        error: "Could not load that quiz result.",
      });
    }
  });

  return router;
}

module.exports = { createQuizRouter };
