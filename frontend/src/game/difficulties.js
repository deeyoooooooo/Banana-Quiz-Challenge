export const DIFFICULTIES = [
  {
    id: "easy",
    name: "Easy",
    tagline: "Relax and Practice",
    description: "No timer, a gentle pace, and an optional even/odd hint.",
    timeLimit: null,
    pointsPerCorrectAnswer: 10,
    hintsEnabled: true,
    questions: 5,
    maxScore: 50,
  },
  {
    id: "medium",
    name: "Medium",
    tagline: "Challenge Yourself",
    description: "A 30-second limit per puzzle. No hints.",
    timeLimit: 30,
    pointsPerCorrectAnswer: 20,
    hintsEnabled: false,
    questions: 5,
    maxScore: 100,
  },
  {
    id: "difficult",
    name: "Difficult",
    tagline: "Test Your Skills",
    description: "A 15-second limit per puzzle. No hints.",
    timeLimit: 15,
    pointsPerCorrectAnswer: 30,
    hintsEnabled: false,
    questions: 5,
    maxScore: 150,
  },
];

export function difficultyMeta(id) {
  return DIFFICULTIES.find((item) => item.id === id) || DIFFICULTIES[0];
}

export function timeLabel(timeLimit) {
  if (timeLimit == null) {
    return "No time limit";
  }
  return `${timeLimit} seconds per question`;
}
