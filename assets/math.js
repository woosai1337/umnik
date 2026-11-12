/* Умник — точный вычислитель: рациональные дроби, степени, корни, функции. */

export class CalcError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CalcError';
  }
}

const MAX_DIGITS = 6000;
const MAX_FACTORIAL = 170;
const MAX_EXPONENT = 10000;

const ZERO = 0n;
const ONE = 1n;

function absBig(n) {
  return n < ZERO ? -n : n;
}

function gcd(a, b) {
  a = absBig(a);
  b = absBig(b);
  while (b) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}

function bigDigitCount(n) {
  return absBig(n).toString().length;
}

function guardSize(n, d) {
  if (bigDigitCount(n) + bigDigitCount(d) > MAX_DIGITS) {
    throw new CalcError('Слишком большое число — попробуй шаг поменьше');
  }
}

/** Точная дробь. Знаменатель всегда положительный, дробь сокращена. */
export class Rational {
  constructor(n, d = ONE) {
    if (typeof n !== 'bigint') n = BigInt(n);
    if (typeof d !== 'bigint') d = BigInt(d);
    if (d === ZERO) throw new CalcError('На ноль делить нельзя');
    if (d < ZERO) {
      n = -n;
      d = -d;
    }
    const g = gcd(n, d);
    if (g > ONE) {
      n /= g;
      d /= g;
    }
    guardSize(n, d);
    this.n = n;
    this.d = d;
  }

  static fromInt(n) {
    return new Rational(BigInt(n), ONE);
  }

  static parse(text) {
    const s = String(text).trim().replace(',', '.');
    const m = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(s);
    if (!m) throw new CalcError('Не понимаю число');
    const sign = m[1] === '-' ? -ONE : ONE;
    const whole = m[2] || '';
    const fraction = m[3] || '';
    if (!whole && !fraction) throw new CalcError('Не понимаю число');
    let n = BigInt((whole + fraction) || '0') * sign;
    let d = fraction.length ? 10n ** BigInt(fraction.length) : ONE;
    const exp = m[4] ? Number(m[4]) : 0;
    if (exp) {
      if (Math.abs(exp) > MAX_EXPONENT) throw new CalcError('Слишком большая степень');
      if (exp > 0) n *= 10n ** BigInt(exp);
      else d *= 10n ** BigInt(-exp);
    }
    return new Rational(n, d);
  }

  static fromNumber(x) {
    if (!Number.isFinite(x)) throw new CalcError('Число вне допустимого диапазона');
    if (Number.isInteger(x)) return new Rational(BigInt(x), ONE);
    return Rational.parse(String(x));
  }

  clone() {
    return new Rational(this.n, this.d);
  }

  get isInteger() {
    return this.d === ONE;
  }

  get sign() {
    return this.n < ZERO ? -1 : this.n > ZERO ? 1 : 0;
  }

  neg() {
    return new Rational(-this.n, this.d);
  }

  abs() {
    return this.n < ZERO ? this.neg() : this.clone();
  }

  add(other) {
    if (this.d === other.d) return new Rational(this.n + other.n, this.d);
    return new Rational(this.n * other.d + other.n * this.d, this.d * other.d);
  }

  sub(other) {
    return this.add(other.neg());
  }

  mul(other) {
    return new Rational(this.n * other.n, this.d * other.d);
  }

  div(other) {
    if (other.n === ZERO) throw new CalcError('На ноль делить нельзя');
    return new Rational(this.n * other.d, this.d * other.n);
  }

  powInt(exp) {
    if (exp === ZERO) return new Rational(ONE, ONE);
    if (exp > BigInt(MAX_EXPONENT) || -exp > BigInt(MAX_EXPONENT)) {
      throw new CalcError('Слишком большая степень');
    }
    if (exp < ZERO) {
      if (this.n === ZERO) throw new CalcError('На ноль делить нельзя');
      return new Rational(this.d ** -exp, this.n ** -exp);
    }
    return new Rational(this.n ** exp, this.d ** exp);
  }

  toNumber() {
    const value = Number(this.n) / Number(this.d);
    if (!Number.isFinite(value)) throw new CalcError('Слишком большое число');
    return value;
  }

  toString() {
    return this.d === ONE ? String(this.n) : String(this.n) + '/' + String(this.d);
  }

  mixedString() {
    if (this.d === ONE) return String(this.n);
    const negative = this.n < ZERO;
    const n = absBig(this.n);
    const whole = n / this.d;
    const rest = n % this.d;
    if (whole === ZERO) return (negative ? '-' : '') + String(rest) + '/' + String(this.d);
    return (negative ? '-' : '') + String(whole) + ' ' + String(rest) + '/' + String(this.d);
  }

  isTerminating() {
    let d = this.d;
    while (d % 2n === ZERO) d /= 2n;
    while (d % 5n === ZERO) d /= 5n;
    return d === ONE;
  }
}

/** Значение: точная дробь либо приближённое число. */
export class Value {
  constructor(rational = null, numeric = null) {
    this.rational = rational;
    this.numeric = numeric;
  }

  static rat(r) {
    return new Value(r, null);
  }

  static num(x) {
    if (!Number.isFinite(x)) throw new CalcError('Число вне допустимого диапазона');
    return new Value(null, x);
  }

  get exact() {
    return this.rational !== null;
  }

  toNumber() {
    return this.rational ? this.rational.toNumber() : this.numeric;
  }

  neg() {
    return this.rational ? Value.rat(this.rational.neg()) : Value.num(-this.numeric);
  }

  abs() {
    return this.rational ? Value.rat(this.rational.abs()) : Value.num(Math.abs(this.numeric));
  }
}

function add(a, b) {
  if (a.exact && b.exact) return Value.rat(a.rational.add(b.rational));
  return Value.num(a.toNumber() + b.toNumber());
}

function sub(a, b) {
  if (a.exact && b.exact) return Value.rat(a.rational.sub(b.rational));
  return Value.num(a.toNumber() - b.toNumber());
}

function mul(a, b) {
  if (a.exact && b.exact) return Value.rat(a.rational.mul(b.rational));
  return Value.num(a.toNumber() * b.toNumber());
}

function div(a, b) {
  if (a.exact && b.exact) {
    if (b.rational.n === ZERO) throw new CalcError('На ноль делить нельзя');
    return Value.rat(a.rational.div(b.rational));
  }
  if (b.toNumber() === 0) throw new CalcError('На ноль делить нельзя');
  return Value.num(a.toNumber() / b.toNumber());
}

function integerRoot(n, k) {
  if (n < ZERO) throw new CalcError('Корень из отрицательного числа');
  if (n < 2n) return n;
  if (bigDigitCount(n) > 500) return null;
  let low = ZERO;
  let high = ONE;
  const kk = BigInt(k);
  while (high ** kk <= n) high *= 2n;
  while (low + ONE < high) {
    const mid = (low + high) / 2n;
    if (mid ** kk <= n) low = mid;
    else high = mid;
  }
  return low;
}

function rationalRoot(r, k) {
  const negative = r.n < ZERO;
  if (negative && k % 2 === 0) throw new CalcError('Корень из отрицательного числа');
  const n = absBig(r.n);
  const rn = integerRoot(n, k);
  if (rn === null) return null;
  const rd = integerRoot(r.d, k);
  if (rd === null) return null;
  if (rn ** BigInt(k) !== n || rd ** BigInt(k) !== r.d) return null;
  return new Rational(negative ? -rn : rn, rd);
}

function powValues(base, exponent) {
  if (exponent.exact && exponent.rational.isInteger) {
    if (base.exact) return Value.rat(base.rational.powInt(exponent.rational.n));
    return Value.num(Math.pow(base.numeric, Number(exponent.rational.n)));
  }
  if (base.exact && exponent.exact) {
    const e = exponent.rational;
    if (e.n === ZERO) return Value.rat(new Rational(ONE, ONE));
    const k = Number(e.d);
    if (k > 1 && k <= 64 && absBig(e.n) <= 64n) {
      const root = rationalRoot(base.rational, k);
      if (root) return Value.rat(root.powInt(e.n));
    }
  }
  const b = base.toNumber();
  const e = exponent.toNumber();
  if (b === 0 && e < 0) throw new CalcError('На ноль делить нельзя');
  if (b < 0 && !Number.isInteger(e)) throw new CalcError('Корень из отрицательного числа');
  const result = Math.pow(b, e);
  if (!Number.isFinite(result)) throw new CalcError('Слишком большое число');
  return Value.num(result);
}

function factorial(value) {
  if (!value.exact || !value.rational.isInteger || value.rational.n < ZERO) {
    throw new CalcError('Факториал — только для целых неотрицательных чисел');
  }
  const n = Number(value.rational.n);
  if (n > MAX_FACTORIAL) throw new CalcError('Слишком большое число для факториала');
  let result = ONE;
  for (let i = 2n; i <= BigInt(n); i += ONE) result *= i;
  return Value.rat(new Rational(result, ONE));
}

function percent(value) {
  return value.exact ? Value.rat(value.rational.div(new Rational(100n, ONE))) : Value.num(value.toNumber() / 100);
}

function finite(value, message) {
  if (!Number.isFinite(value)) throw new CalcError(message || 'Число вне допустимого диапазона');
  return Value.num(value);
}

function applyFunction(name, value, angleMode) {
  const x = value.toNumber();
  const deg = angleMode !== 'rad';
  switch (name) {
    case 'sqrt': {
      if (value.exact) {
        if (value.rational.n < ZERO) throw new CalcError('Корень из отрицательного числа');
        const root = rationalRoot(value.rational, 2);
        if (root) return Value.rat(root);
      }
      if (x < 0) throw new CalcError('Корень из отрицательного числа');
      return finite(Math.sqrt(x));
    }
    case 'cbrt': {
      if (value.exact) {
        const root = rationalRoot(value.rational, 3);
        if (root) return Value.rat(root);
      }
      return finite(Math.cbrt(x));
    }
    case 'sin':
      return finite(Math.sin(deg ? (x * Math.PI) / 180 : x));
    case 'cos':
      return finite(Math.cos(deg ? (x * Math.PI) / 180 : x));
    case 'tan': {
      const angle = deg ? (x * Math.PI) / 180 : x;
      if (Math.abs(Math.cos(angle)) < 1e-14) throw new CalcError('Тангенс здесь не определён');
      return finite(Math.tan(angle));
    }
    case 'asin':
    case 'acos': {
      if (x < -1 || x > 1) throw new CalcError('Аргумент должен быть от −1 до 1');
      const result = name === 'asin' ? Math.asin(x) : Math.acos(x);
      return finite(deg ? (result * 180) / Math.PI : result);
    }
    case 'atan':
      return finite(deg ? (Math.atan(x) * 180) / Math.PI : Math.atan(x));
    case 'ln':
      if (x <= 0) throw new CalcError('Логарифм только от положительного числа');
      return finite(Math.log(x));
    case 'log':
    case 'log10':
      if (x <= 0) throw new CalcError('Логарифм только от положительного числа');
      return finite(Math.log10(x));
    case 'log2':
      if (x <= 0) throw new CalcError('Логарифм только от положительного числа');
      return finite(Math.log2(x));
    case 'exp':
      return finite(Math.exp(x), 'Слишком большое число');
    case 'abs':
      return value.abs();
    case 'sign':
      return Value.rat(Rational.fromInt(value.exact ? value.rational.sign : Math.sign(x)));
    case 'round':
    case 'floor':
    case 'ceil': {
      if (!Number.isFinite(x) || Math.abs(x) > 1e15) throw new CalcError('Слишком большое число');
      const r = name === 'round' ? Math.round(x) : name === 'floor' ? Math.floor(x) : Math.ceil(x);
      return Value.rat(Rational.fromInt(r));
    }
    default:
      throw new CalcError('Неизвестная функция «' + name + '»');
  }
}

const CONSTANTS = new Map([
  ['pi', () => Value.num(Math.PI)],
  ['e', () => Value.num(Math.E)],
  ['tau', () => Value.num(Math.PI * 2)]
]);

const FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
  'sqrt', 'cbrt', 'ln', 'log', 'log10', 'log2',
  'abs', 'round', 'floor', 'ceil', 'exp', 'sign'
]);

function normalizeInput(input) {
  return String(input)
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/[−–—]/g, '-')
    .replace(/π/g, 'pi')
    .replace(/√/g, 'sqrt')
    .replace(/∛/g, 'cbrt')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function tokenize(input) {
  const s = input;
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {
      i += 1;
      continue;
    }
    const numberMatch = /^(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][+-]?\d+)?/.exec(s.slice(i));
    if (numberMatch) {
      tokens.push({ type: 'number', value: numberMatch[0] });
      i += numberMatch[0].length;
      continue;
    }
    if (/[A-Za-z]/.test(c)) {
      let name = '';
      while (i < s.length && /[A-Za-z]/.test(s[i])) {
        name += s[i];
        i += 1;
      }
      name = name.toLowerCase();
      if (name === 'log' && s[i] === '2') {
        name = 'log2';
        i += 1;
      }
      tokens.push({ type: 'name', value: name });
      continue;
    }
    if ('+-*/^!%()'.includes(c)) {
      tokens.push({ type: 'op', value: c });
      i += 1;
      continue;
    }
    throw new CalcError('Непонятный символ «' + c + '»');
  }
  return tokens;
}

class Parser {
  constructor(tokens, angleMode) {
    this.tokens = tokens;
    this.pos = 0;
    this.angleMode = angleMode;
  }

  peek() {
    return this.tokens[this.pos] || null;
  }

  matchOp(value) {
    const token = this.peek();
    if (token && token.type === 'op' && token.value === value) {
      this.pos += 1;
      return true;
    }
    return false;
  }

  expectOp(value) {
    if (!this.matchOp(value)) throw new CalcError('Не хватает «' + value + '»');
  }

  startsPrimary(token) {
    return !!token && (token.type === 'number' || token.type === 'name' || (token.type === 'op' && token.value === '('));
  }

  parse() {
    if (!this.tokens.length) throw new CalcError('Пустое выражение');
    const value = this.expression();
    if (this.peek()) {
      throw new CalcError('Лишний символ «' + this.peek().value + '»');
    }
    return value;
  }

  expression() {
    let value = this.term();
    while (this.matchOp('+') || this.matchOp('-')) {
      const op = this.tokens[this.pos - 1].value;
      const right = this.term();
      value = op === '+' ? add(value, right) : sub(value, right);
    }
    return value;
  }

  term() {
    let value = this.unary();
    while (true) {
      if (this.matchOp('*')) {
        value = mul(value, this.unary());
      } else if (this.matchOp('/')) {
        value = div(value, this.unary());
      } else if (this.startsPrimary(this.peek())) {
        value = mul(value, this.unary());
      } else {
        break;
      }
    }
    return value;
  }

  unary() {
    if (this.matchOp('+')) return this.unary();
    if (this.matchOp('-')) return this.unary().neg();
    return this.power();
  }

  power() {
    const base = this.postfix();
    if (this.matchOp('^')) {
      const exponent = this.unary();
      return powValues(base, exponent);
    }
    return base;
  }

  postfix() {
    let value = this.primary();
    while (true) {
      if (this.matchOp('!')) value = factorial(value);
      else if (this.matchOp('%')) value = percent(value);
      else break;
    }
    return value;
  }

  primary() {
    const token = this.tokens[this.pos];
    if (!token) throw new CalcError('Выражение обрывается');
    this.pos += 1;

    if (token.type === 'number') {
      return Value.rat(Rational.parse(token.value));
    }

    if (token.type === 'op' && token.value === '(') {
      if (this.matchOp(')')) throw new CalcError('Пустые скобки');
      const value = this.expression();
      this.expectOp(')');
      return value;
    }

    if (token.type === 'name') {
      const name = token.value;
      if (CONSTANTS.has(name)) return CONSTANTS.get(name)();
      if (!FUNCTIONS.has(name)) throw new CalcError('Неизвестное имя «' + name + '»');
      let argument;
      if (this.matchOp('(')) {
        if (this.matchOp(')')) throw new CalcError('Пустой аргумент функции');
        argument = this.expression();
        this.expectOp(')');
      } else {
        argument = this.unary();
      }
      return applyFunction(name, argument, this.angleMode);
    }

    throw new CalcError('Неожиданный символ «' + token.value + '»');
  }
}

/** Публичный расчёт. angleMode: 'deg' | 'rad'. */
export function evaluate(expression, angleMode = 'deg') {
  const normalized = normalizeInput(expression);
  if (!normalized) throw new CalcError('Пустое выражение');
  const tokens = tokenize(normalized);
  return new Parser(tokens, angleMode).parse();
}

/** Аккуратно подготавливает недописанное выражение для живого предпросмотра. */
export function prepareExpression(expression) {
  let s = String(expression).trim();
  if (!s) return '';
  s = s.replace(/[+\-*/^]+$/, '');
  s = s.replace(/,$/, '');
  if (s.endsWith('(')) return s;
  let open = 0;
  let close = 0;
  for (const ch of s) {
    if (ch === '(') open += 1;
    if (ch === ')') close += 1;
  }
  if (open > close) s += ')'.repeat(open - close);
  return s;
}

export function preview(expression, angleMode = 'deg') {
  try {
    const prepared = prepareExpression(expression);
    if (!prepared) return null;
    return evaluate(prepared, angleMode);
  } catch {
    return null;
  }
}

export function formatNumber(x, maxDigits = 12) {
  if (!Number.isFinite(x)) return 'ошибка';
  if (x === 0) return '0';
  const abs = Math.abs(x);
  if (abs >= 1e15 || abs < 1e-9) {
    return x.toExponential(Math.min(maxDigits, 10)).replace('.', ',').replace('e+', 'e');
  }
  const rounded = Number(x.toFixed(maxDigits));
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: maxDigits,
    useGrouping: true
  }).format(rounded);
}

export function fractionString(value) {
  if (!value.exact) return null;
  const r = value.rational;
  if (r.d === ONE) return String(r.n);
  return String(r.n) + '/' + String(r.d);
}

export function mixedString(value) {
  if (!value.exact) return null;
  return value.rational.mixedString();
}

export function decimalIsExact(value) {
  return value.exact && value.rational.isTerminating();
}

export function describeValue(value) {
  let decimal = '—';
  let exactDecimal = false;
  try {
    decimal = formatNumber(value.toNumber());
    exactDecimal = decimalIsExact(value);
  } catch {
    /* Огромную дробь показываем только дробью. */
  }
  return {
    exact: value.exact,
    fraction: fractionString(value),
    mixed: mixedString(value),
    decimal,
    exactDecimal,
    isInteger: value.exact && value.rational.isInteger
  };
}
