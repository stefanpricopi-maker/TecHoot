/** Întrebări statice pentru MVP; indexul în sesiune (`current_question_index`) indică elementul activ. */
export type QuizQuestionData = {
  id: string;
  text: string;
  /** 2–4 variante (ca în DB `questions.options`). */
  options: readonly string[];
  correctAnswerIndex: number;
  /** Durata rundei în secunde. */
  timeLimit: number;
};

export const QUIZ_QUESTIONS: QuizQuestionData[] = [
  {
    id: "q-capital-fr",
    text: "Care este capitala Franței?",
    options: ["Lyon", "Marseille", "Paris", "Nice"],
    correctAnswerIndex: 2,
    timeLimit: 20,
  },
  {
    id: "q-planets",
    text: "Câte planete are sistemul solar (model clasic, fără Pluton)?",
    options: ["7", "8", "9", "10"],
    correctAnswerIndex: 1,
    timeLimit: 25,
  },
  {
    id: "q-html",
    text: "Ce înseamnă HTML?",
    options: [
      "Hyper Tool Markup Language",
      "Hyper Text Markup Language",
      "High Transfer Meta List",
      "Home Text Modern Link",
    ],
    correctAnswerIndex: 1,
    timeLimit: 30,
  },
];

export function getQuizQuestionByIndex(index: number): QuizQuestionData | null {
  return QUIZ_QUESTIONS[index] ?? null;
}

export function getQuizLength(): number {
  return QUIZ_QUESTIONS.length;
}

export function getQuestionIdByIndex(index: number): string | null {
  return QUIZ_QUESTIONS[index]?.id ?? null;
}
