/**
 * Decides an SPDX license expression by asking `isAllowed` about each license identifier.
 * `AND` binds tighter than `OR`, parentheses group, and `WITH <exception>` is judged by the
 * license before it, because an exception only grants permissions.
 * Throws when the expression is malformed.
 */
export function evaluateSpdxExpression(
  expression: string,
  isAllowed: (license: string) => boolean,
): boolean {
  const tokens = expression.match(/[()]|[^\s()]+/g) ?? [];
  const cursor = { tokens, position: 0, isAllowed };
  const result = evaluateOr(cursor);
  if (cursor.position < tokens.length)
    throw new Error(`unexpected "${tokens[cursor.position]}" in ${expression}`);
  return result;
}

interface Cursor {
  tokens: string[];
  position: number;
  isAllowed: (license: string) => boolean;
}

function evaluateOr(cursor: Cursor): boolean {
  let result = evaluateAnd(cursor);
  while (accept(cursor, "OR")) result = evaluateAnd(cursor) || result;
  return result;
}

function evaluateAnd(cursor: Cursor): boolean {
  let result = evaluateTerm(cursor);
  while (accept(cursor, "AND")) result = evaluateTerm(cursor) && result;
  return result;
}

function evaluateTerm(cursor: Cursor): boolean {
  if (accept(cursor, "(")) {
    const result = evaluateOr(cursor);
    if (!accept(cursor, ")")) throw new Error("missing closing parenthesis");
    return result;
  }
  const license = take(cursor);
  if (accept(cursor, "WITH")) take(cursor);
  return cursor.isAllowed(license);
}

function accept(cursor: Cursor, token: string): boolean {
  if (cursor.tokens[cursor.position] !== token) return false;
  cursor.position++;
  return true;
}

function take(cursor: Cursor): string {
  const token = cursor.tokens[cursor.position];
  if (token === undefined || ["(", ")", "AND", "OR", "WITH"].includes(token))
    throw new Error(
      `expected a license identifier, found ${token ?? "the end"}`,
    );
  cursor.position++;
  return token;
}
