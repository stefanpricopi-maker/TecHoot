export function clampQuestionLimit(
  totalQuestions: number,
  sessionQuestionCount: number | null | undefined,
): number {
  const total = Number.isFinite(totalQuestions) ? Math.max(0, totalQuestions) : 0;
  const raw =
    typeof sessionQuestionCount === "number" && Number.isFinite(sessionQuestionCount)
      ? Math.floor(sessionQuestionCount)
      : null;
  if (raw == null || raw <= 0) {
    return total;
  }
  return Math.min(total, raw);
}

