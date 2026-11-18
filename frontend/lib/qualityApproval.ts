// Contagens medidas de placas distintas no mesmo escopo de inspeção.
export interface ConfirmedBoardCounts {
  inspectedBoards: number;
  approvedBoards: number;
}

export function calculateBoardApproval(counts?: ConfirmedBoardCounts | null) {
  if (!counts) return null;
  const { inspectedBoards, approvedBoards } = counts;
  if (!Number.isSafeInteger(inspectedBoards) || !Number.isSafeInteger(approvedBoards) ||
    inspectedBoards <= 0 || approvedBoards < 0 || approvedBoards > inspectedBoards) return null;
  return { inspectedBoards, approvedBoards, percent: (approvedBoards / inspectedBoards) * 100 };
}
