import { expr2xy, xy2expr } from './alphabet';

// Parse expressions structurally so each function owns its arguments, even when nested.
function parseFormula(source) {
  const tokens = [];
  const pattern = /\s+|"(?:[^"]|"")*"|\$?[A-Za-z]+\$?[1-9]\d*|(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?|[A-Za-z_][A-Za-z_0-9.]*|<>|<=|>=|[+\-*/^&%=<>(),:]/gy;
  let offset = 0;
  while (offset < source.length) {
    pattern.lastIndex = offset;
    const match = pattern.exec(source);
    if (!match) throw new Error('Unsupported formula syntax');
    offset = pattern.lastIndex;
    if (!/^\s+$/.test(match[0])) tokens.push(match[0]);
  }
  let position = 0;
  const peek = () => tokens[position];
  const take = () => tokens[position++];
  const expect = (token) => {
    if (take() !== token) throw new Error('Invalid formula');
  };
  const precedence = { '=': 1, '<>': 1, '<': 1, '>': 1, '<=': 1, '>=': 1, '&': 2, '+': 3, '-': 3, '*': 4, '/': 4, '^': 5 };
  function primary() {
    const token = take();
    if (token === undefined) throw new Error('Missing formula operand');
    if (token === '+' || token === '-') return { type: 'unary', operator: token, value: primary() };
    let node;
    if (token === '(') {
      node = expression(0);
      expect(')');
    } else if (token.startsWith('"')) {
      node = { type: 'literal', value: token.slice(1, -1).replace(/""/g, '"') };
    } else if (/^(?:\d|\.)/.test(token)) {
      node = { type: 'literal', value: Number(token) };
    } else if (/^\$?[A-Za-z]+\$?[1-9]\d*$/.test(token)) {
      node = { type: 'reference', address: token.replace(/\$/g, '').toUpperCase() };
      if (peek() === ':') {
        take();
        const end = primary();
        if (end.type !== 'reference') throw new Error('Invalid range');
        node = { type: 'range', start: node.address, end: end.address };
      }
    } else if (/^[A-Za-z_]/.test(token)) {
      const name = token.toUpperCase();
      if (name === 'TRUE' || name === 'FALSE') node = { type: 'literal', value: name === 'TRUE' };
      else {
        expect('(');
        const args = [];
        if (peek() !== ')') {
          do {
            if (peek() === ',') take();
            args.push(expression(0));
          } while (peek() === ',');
        }
        expect(')');
        node = { type: 'function', name, args };
      }
    } else throw new Error('Invalid formula operand');
    while (peek() === '%') {
      take();
      node = { type: 'binary', operator: '/', left: node, right: { type: 'literal', value: 100 } };
    }
    return node;
  }
  function expression(minPrecedence) {
    let left = primary();
    while (precedence[peek()] !== undefined && precedence[peek()] >= minPrecedence) {
      const operator = take();
      const right = expression(precedence[operator] + (operator === '^' ? 0 : 1));
      left = { type: 'binary', operator, left, right };
    }
    return left;
  }
  const ast = expression(0);
  if (position !== tokens.length) throw new Error('Unexpected formula token');
  return ast;
}

const isError = value => typeof value === 'string' && /^#(?:REF!|DIV\/0!|VALUE!|NAME\?|NUM!|N\/A|CYCLE!)/.test(value);
function numeric(value) {
  if (value === '' || value == null) return 0;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error('Invalid numeric operand');
  return number;
}

function cellRender(src, formulaMap, getCellText, visiting = new Set()) {
  if (typeof src !== 'string' || !src.startsWith('=')) return src;
  function evaluate(node) {
    if (node.type === 'literal') return node.value;
    if (node.type === 'reference') {
      if (visiting.has(node.address)) return '#CYCLE!';
      visiting.add(node.address);
      try {
        const [x, y] = expr2xy(node.address);
        const result = cellRender(getCellText(x, y) ?? '', formulaMap, getCellText, visiting);
        return typeof result === 'string' && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?$/.test(result)
          ? Number(result) : result;
      } finally { visiting.delete(node.address); }
    }
    if (node.type === 'range') {
      const [sx, sy] = expr2xy(node.start);
      const [ex, ey] = expr2xy(node.end);
      const values = [];
      for (let y = Math.min(sy, ey); y <= Math.max(sy, ey); y += 1) {
        for (let x = Math.min(sx, ex); x <= Math.max(sx, ex); x += 1) {
          // Use the same cycle tracking as individual references.
          values.push(evaluate({ type: 'reference', address: xy2expr(x, y) }));
        }
      }
      return values;
    }
    if (node.type === 'unary') {
      const value = evaluate(node.value);
      if (isError(value)) return value;
      return numeric(value) * (node.operator === '-' ? -1 : 1);
    }
    if (node.type === 'function') {
      // Excel evaluates only the selected IF branch.
      if (node.name === 'IF') {
        if (node.args.length < 2 || node.args.length > 3) return '#VALUE!';
        const condition = evaluate(node.args[0]);
        if (isError(condition)) return condition;
        const branch = node.args[condition ? 1 : 2];
        return branch ? evaluate(branch) : false;
      }
      const values = node.args.flatMap(arg => evaluate(arg));
      const error = values.find(isError);
      if (error) return error;
      if (node.name === 'UPPER') return String(values[0] ?? '').toUpperCase();
      const formula = formulaMap[node.name];
      return formula ? formula.render(values) : '#NAME?';
    }
    const left = evaluate(node.left);
    const right = evaluate(node.right);
    if (isError(left)) return left;
    if (isError(right)) return right;
    const op = node.operator;
    if (op === '&') return String(left) + String(right);
    if (['=', '<>', '<', '>', '<=', '>='].includes(op)) {
      const a = typeof left === 'string' ? left.toUpperCase() : left;
      const b = typeof right === 'string' ? right.toUpperCase() : right;
      if (op === '=') return a === b;
      if (op === '<>') return a !== b;
      if (op === '<') return a < b;
      if (op === '>') return a > b;
      if (op === '<=') return a <= b;
      return a >= b;
    }
    const a = numeric(left);
    const b = numeric(right);
    if (op === '+') return a + b;
    if (op === '-') return a - b;
    if (op === '*') return a * b;
    if (op === '/') return b === 0 ? '#DIV/0!' : a / b;
    const value = a ** b;
    return Number.isFinite(value) ? value : '#NUM!';
  }
  return evaluate(parseFormula(src.slice(1)));
}

export default { render: cellRender };
export { parseFormula };
