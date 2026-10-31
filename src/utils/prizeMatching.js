// Shared winning-number matching rules used by the voucher screen, ledger,
// daily bill and total sale report. Keep this the single source of truth so
// every report computes the same prize.
//
// Positions are 1-based on a 4-digit winning number, e.g. 6432:
//   HINSA    7 -> pos1, +7 -> pos2, ++7 -> pos3, +++7 -> pos4
//   AKRA     NN -> 1,2   +NN / +NN+ -> 2,3   ++NN -> 3,4
//            N+N+ -> 1,3   N++N -> 1,4   +N+N -> 2,4
//   TANDOLA  NNN -> 1,2,3   +NNN -> 2,3,4   NN+N -> 1,2,4   N+NN -> 1,3,4
//   PANGORA  NNNN -> all four

export const normalizeWinningNumber = (winningNumber) =>
  String(winningNumber ?? '').trim().replace(/\D/g, '').padStart(4, '0').slice(-4);

const PATTERNS = [
  // [regex, winning-number positions (0-based) the entry digits must equal]
  [/^(\d)$/, [0]],
  [/^\+(\d)$/, [1]],
  [/^\+\+(\d)$/, [2]],
  [/^\+\+\+(\d)$/, [3]],

  [/^(\d)(\d)$/, [0, 1]],
  [/^\+(\d)(\d)$/, [1, 2]],
  [/^\+(\d)(\d)\+$/, [1, 2]],
  [/^\+\+(\d)(\d)$/, [2, 3]],
  [/^(\d)\+(\d)\+$/, [0, 2]],
  [/^(\d)\+\+(\d)$/, [0, 3]],
  [/^\+(\d)\+(\d)$/, [1, 3]],

  [/^(\d)(\d)(\d)$/, [0, 1, 2]],
  [/^\+(\d)(\d)(\d)$/, [1, 2, 3]],
  [/^(\d)(\d)\+(\d)$/, [0, 1, 3]],
  [/^(\d)\+(\d)(\d)$/, [0, 2, 3]],

  [/^(\d)(\d)(\d)(\d)$/, [0, 1, 2, 3]],
];

export const checkPositionalMatch = (entry, winningNumber) => {
  const cleanEntry = String(entry ?? '').trim();
  const win = normalizeWinningNumber(winningNumber);
  if (!cleanEntry || !/\d/.test(String(winningNumber ?? ''))) return false;

  for (const [re, positions] of PATTERNS) {
    const m = cleanEntry.match(re);
    if (!m) continue;
    return positions.every((pos, i) => win[pos] === m[i + 1]);
  }
  return false;
};

export const isWinningEntry = (entry, winningNumber) =>
  String(entry ?? '').trim() === String(winningNumber ?? '').trim()
  || checkPositionalMatch(entry, winningNumber);
