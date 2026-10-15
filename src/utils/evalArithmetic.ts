const MAX_DEPTH = 50;

// Recursive-descent parser for: expr = term (('+'|'-') term)*, term = unary (('*'|'/') unary)*,
// unary = ('+'|'-') unary | number | '(' expr ')'
class Parser {
  private pos = 0;

  constructor(private readonly src: string) {}

  parse(): number | null {
    const value = this.expr(0);
    this.skipSpaces();
    return value !== null && this.pos === this.src.length ? value : null;
  }

  private skipSpaces() {
    while (this.src[this.pos] === ' ' || this.src[this.pos] === '\t') this.pos++;
  }

  private peek(): string | undefined {
    this.skipSpaces();
    return this.src[this.pos];
  }

  private expr(depth: number): number | null {
    let left = this.term(depth);
    while (left !== null && (this.peek() === '+' || this.peek() === '-')) {
      const op = this.src[this.pos++];
      const right = this.term(depth);
      if (right === null) return null;
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  private term(depth: number): number | null {
    let left = this.unary(depth);
    while (left !== null && (this.peek() === '*' || this.peek() === '/')) {
      const op = this.src[this.pos++];
      const right = this.unary(depth);
      if (right === null) return null;
      left = op === '*' ? left * right : left / right;
    }
    return left;
  }

  private unary(depth: number): number | null {
    const ch = this.peek();
    if (ch === '+' || ch === '-') {
      this.pos++;
      const value = this.unary(depth);
      return value === null ? null : ch === '-' ? -value : value;
    }
    if (ch === '(') {
      if (depth >= MAX_DEPTH) return null;
      this.pos++;
      const value = this.expr(depth + 1);
      if (value === null || this.peek() !== ')') return null;
      this.pos++;
      return value;
    }
    return this.number();
  }

  private number(): number | null {
    const match = /^(?:\d+\.?\d*|\.\d+)/.exec(this.src.slice(this.pos));
    if (!match) return null;
    this.pos += match[0].length;
    return Number(match[0]);
  }
}

// Evaluates a plain arithmetic expression ("100", "50+30", "200/4"); null if invalid
export function evalArithmetic(expr: string): number | null {
  const result = new Parser(expr).parse();
  if (result === null || !Number.isFinite(result)) return null;
  return Math.round(result * 100) / 100;
}
