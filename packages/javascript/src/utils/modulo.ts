/**
 * Correct modulo operator
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Remainder#description
 */
export function modulo(n: number, divisor: number) {
  return ((n % divisor) + divisor) % divisor;
}

export function moduloDiff(n: number, m: number, divisor: number) {
  n = modulo(n, divisor);
  m = modulo(m, divisor);

  if (Math.abs(n - m) < divisor / 2) {
    return n - m;
  } else {
    return n < m ? n + divisor - m : n - (m + divisor);
  }
}
