/**
 * Finds every number a painter could have meant in a transcript, so the app
 * can check that a price or percentage the AI returned was actually said.
 * Handles digits ("$1,100", "1.1k", "11 hundred"), standard words
 * ("eleven hundred", "two thousand five hundred") and NZ trade shorthand
 * ("four fifty" = 450, "one ninety" = 190, "two grand" = 2000).
 */
const UNITS = { zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
const TEENS = { ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const TENS = { twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const THOUSANDS = new Set(["thousand", "grand", "k"]);
const NUMBER_WORDS = new Set([
  ...Object.keys(UNITS),
  ...Object.keys(TEENS),
  ...Object.keys(TENS),
  ...THOUSANDS,
  "hundred",
  "and",
  "a",
]);

function smallValue(word) {
  return UNITS[word] ?? TEENS[word] ?? TENS[word] ?? null;
}

/** "fifty" or "twenty five" -> 0-99, anything else -> null. */
function parseUnderHundred(tokens) {
  if (tokens.length === 1) return smallValue(tokens[0]);
  if (tokens.length === 2 && TENS[tokens[0]] != null && UNITS[tokens[1]] > 0) {
    return TENS[tokens[0]] + UNITS[tokens[1]];
  }
  return null;
}

function parseStandard(tokens) {
  let total = 0;
  let current = 0;
  let sawNumber = false;
  for (let i = 0; i < tokens.length; i += 1) {
    const word = tokens[i];
    if (word === "and") continue;
    if (word === "a") {
      if (tokens[i + 1] !== "hundred" && !THOUSANDS.has(tokens[i + 1])) return null;
      current += 1;
      sawNumber = true;
      continue;
    }
    const small = smallValue(word);
    if (small != null) {
      current += small;
      sawNumber = true;
    } else if (word === "hundred") {
      current = (current || 1) * 100;
      sawNumber = true;
    } else if (THOUSANDS.has(word)) {
      total += (current || 1) * 1000;
      current = 0;
      sawNumber = true;
    } else {
      return null;
    }
  }
  return sawNumber ? total + current : null;
}

/** "four fifty" -> 450, "eleven fifty" -> 1150, "one ninety" -> 190. */
function parseTradeHundreds(tokens) {
  const values = [];
  for (let split = 1; split < tokens.length; split += 1) {
    const left = parseUnderHundred(tokens.slice(0, split));
    const right = parseUnderHundred(tokens.slice(split));
    if (left > 0 && right >= 10) values.push(left * 100 + right);
  }
  return values;
}

function addWordRun(run, values) {
  for (let start = 0; start < run.length; start += 1) {
    for (let end = start + 1; end <= run.length; end += 1) {
      const sub = run.slice(start, end);
      if (sub[0] === "and" || sub[sub.length - 1] === "and") continue;
      const standard = parseStandard(sub);
      if (standard != null) values.add(standard);
      for (const trade of parseTradeHundreds(sub)) values.add(trade);
    }
  }
}

export function extractSpokenNumbers(text) {
  const values = new Set();
  const clean = String(text || "")
    .toLowerCase()
    .replace(/(\d),(?=\d{3})/g, "$1");

  for (const match of clean.matchAll(/(\d+(?:\.\d+)?)\s*(k|grand|thousand|hundred)?\b/g)) {
    const n = Number(match[1]);
    if (!Number.isFinite(n)) continue;
    values.add(n);
    if (match[2]) values.add(Math.round(n * (match[2] === "hundred" ? 100 : 1000) * 100) / 100);
  }

  const words = clean.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  let run = [];
  for (const word of words) {
    if (NUMBER_WORDS.has(word)) {
      run.push(word);
    } else {
      addWordRun(run, values);
      run = [];
    }
  }
  addWordRun(run, values);
  return values;
}

/** True when `value` appears anywhere in `text` as digits or spoken words. */
export function isNumberSpoken(value, text) {
  const target = Number(value);
  if (!Number.isFinite(target)) return false;
  for (const n of extractSpokenNumbers(text)) {
    if (Math.abs(n - target) < 0.01) return true;
  }
  return false;
}