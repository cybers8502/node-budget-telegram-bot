// Evaluates a plain arithmetic expression ("100", "50+30", "200/4"); null if invalid
export function evalArithmetic(expr: string): number | null {
  if (!/^[\d\s+\-*/.()]+$/.test(expr)) return null;
  try {
    const result: unknown = Function(`"use strict"; return (${expr})`)();
    if (typeof result !== 'number' || !Number.isFinite(result)) return null;
    return Math.round(result * 100) / 100;
  } catch {
    return null;
  }
}
