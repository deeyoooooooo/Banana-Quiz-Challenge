const express = require("express");
const { requireAuth } = require("../middleware/requireAuth");
const { parseAnswer } = require("../services/validation");
const { publicBananaError } = require("../services/bananaService");

function publicPuzzle(quiz) {
  return {
    question: quiz.current.question,
    questionNumber: quiz.questionNumber,
    totalQuestions: quiz.totalQuestions,
    score: quiz.score,
    answered: quiz.answered,
  };
}

async function loadPuzzle(bananaService, quiz) {
  const puzzle = await bananaService.fetchPuzzle();
  quiz.current = {
    question: puzzle.question,
    solution: puzzle.solution,
  };
}

function createQuizRouter({ db, bananaService, questionsPerQuiz }) {
  const router = express.Router();
  router.use(requireAuth);

  router.post("/start", async (req, res) => {
    const quiz = {
      score: 0,
      answered: 0,
      questionNumber: 1,
      totalQuestions: questionsPerQuiz,
      current: null,
      completed: false,
    };

    try {
      await loadPuzzle(bananaService, quiz);
    } catch (error) {
      const mapped = publicBananaError(error);
      return res.status(mapped.status).json({ error: mapped.message });
    }

    req.session.quiz = quiz;
    return res.json({
      message: "Quiz started.",
      puzzle: publicPuzzle(quiz),
    });
  });

  router.get("/current", (req, res) => {
    const quiz = req.session.quiz;
    if (!quiz || quiz.completed || !quiz.current) {
      return res.status(404).json({
        error: "No active quiz. Start a new quiz from the dashboard.",
      });
    }
    return res.json({ puzzle: publicPuzzle(quiz) });
  });

  router.post("/retry", async (req, res) => {
    const quiz = req.session.quiz;
    if (!quiz || quiz.completed) {
      return res.status(404).json({
        error: "No active quiz. Start a new quiz from the dashboard.",
      });
    }

    try {
      await loadPuzzle(bananaService, quiz);
    } catch (error) {
      const mapped = publicBananaError(error);
      return res.status(mapped.status).json({ error: mapped.message });
    }

    return res.json({
      message: "Puzzle loaded.",
      puzzle: publicPuzzle(quiz),
    });
  });

  router.post("/answer", async (req, res) => {
    const quiz = req.session.quiz;
    if (!quiz || quiz.completed || !quiz.current) {
      return res.status(404).json({
        error: "No active quiz. Start a new quiz from the dashboard.",
      });
    }

    const parsed = parseAnswer(req.body && req.body.answer);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    const correct = parsed.answer === Number(quiz.current.solution);
    if (correct) {
      quiz.score += 1;
    }
    quiz.answered += 1;
    quiz.current = null;

    if (quiz.answered >= quiz.totalQuestions) {
      quiz.completed = true;
      const createdAt = new Date().toISOString();

      try {
        const result = db
          .prepare(
            `INSERT INTO quiz_results (user_id, score, total_questions, created_at)
             VALUES (?, ?, ?, ?)`
          )
          .run(req.session.user.id, quiz.score, quiz.totalQuestions, createdAt);

        req.session.quiz = quiz;
        return res.json({
          correct,
          completed: true,
          score: quiz.score,
          answered: quiz.answered,
          totalQuestions: quiz.totalQuestions,
          resultId: result.lastInsertRowid,
        });
      } catch (error) {
        quiz.completed = true;
        req.session.quiz = quiz;
        return res.status(500).json({
          error: "Your answers were scored, but the result could not be saved.",
          correct,
          completed: true,
          score: quiz.score,
          answered: quiz.answered,
          totalQuestions: quiz.totalQuestions,
        });
      }
    }

    quiz.questionNumber += 1;
    try {
      await loadPuzzle(bananaService, quiz);
    } catch (error) {
      req.session.quiz = quiz;
      const mapped = publicBananaError(error);
      return res.status(mapped.status).json({
        error: mapped.message,
        correct,
        completed: false,
        score: quiz.score,
        answered: quiz.answered,
        totalQuestions: quiz.totalQuestions,
        needsRetry: true,
      });
    }

    req.session.quiz = quiz;
    return res.json({
      correct,
      completed: false,
      score: quiz.score,
      answered: quiz.answered,
      puzzle: publicPuzzle(quiz),
    });
  });

  router.get("/results", (req, res) => {
    try {
      const rows = db
        .prepare(
          `SELECT id, score, total_questions AS totalQuestions, created_at AS createdAt
           FROM quiz_results
           WHERE user_id = ?
           ORDER BY id DESC`
        )
        .all(req.session.user.id);
      return res.json({ results: rows });
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
          `SELECT id, score, total_questions AS totalQuestions, created_at AS createdAt
           FROM quiz_results
           WHERE id = ? AND user_id = ?`
        )
        .get(id, req.session.user.id);

      if (!row) {
        return res.status(404).json({
          error: "Result not found.",
        });
      }
      return res.json({ result: row });
    } catch (error) {
      return res.status(500).json({
        error: "Could not load that quiz result.",
      });
    }
  });

  return router;
}

module.exports = { createQuizRouter };
