import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, describeValue, prepareExpression } from '../assets/math.js';

function exact(expression, expected, mode = 'deg') {
  const value = evaluate(expression, mode);
  assert.equal(value.exact, true, expression + ' должно быть точным');
  assert.equal(value.rational.toString(), expected, expression);
}

function close(expression, expected, mode = 'deg', eps = 1e-10) {
  const value = evaluate(expression, mode);
  assert.ok(Math.abs(value.toNumber() - expected) < eps, expression + ' → ' + value.toNumber());
}

function fails(expression, mode = 'deg') {
  assert.throws(() => evaluate(expression, mode), Error, expression + ' должно падать');
}

test('дроби и сокращение', () => {
  exact('1/2 + 1/3', '5/6');
  exact('2/4', '1/2');
  exact('-1/2 + 1/4', '-1/4');
  exact('3/6 + 2/6', '5/6');
  exact('2/3 * 3/4', '1/2');
  exact('(1/2) / (3/4)', '2/3');
  exact('3.5', '7/2');
  exact('0.1 + 0.2', '3/10');
  exact('1,25 + 0,25', '3/2');
  exact('2/4 + 2/4', '1');
});

test('степени, кубы и корни', () => {
  exact('2^3^2', '512');
  exact('-3^2', '-9');
  exact('(-3)^2', '9');
  exact('2^-3', '1/8');
  exact('(-2)^3', '-8');
  exact('9^(1/2)', '3');
  exact('8^(1/3)', '2');
  exact('27^(1/3)', '3');
  exact('(8/27)^(2/3)', '4/9');
  exact('sqrt(9/4)', '3/2');
  exact('sqrt(144)', '12');
  exact('cbrt(-8)', '-2');
  exact('cbrt(27/8)', '3/2');
  exact('cbrt(64)', '4');
  close('sqrt(2)^2', 2);
});

test('факториал и проценты', () => {
  exact('5!', '120');
  exact('0!', '1');
  exact('50%', '1/2');
  exact('200 * 15%', '30');
  fails('(-1)!');
  fails('2.5!');
});

test('неявное умножение и константы', () => {
  exact('2(3+4)', '14');
  exact('(2)(3)', '6');
  close('2pi', Math.PI * 2);
  close('e', Math.E);
  close('tau', Math.PI * 2);
});

test('функции и углы', () => {
  close('sin(30)', 0.5);
  close('cos(60)', 0.5);
  close('sin(pi/2)', 1, 'rad');
  close('cos(pi)', -1, 'rad');
  close('log(100)', 2);
  close('log2(8)', 3);
  close('ln(e)', 1);
  close('abs(-7/3)', 7 / 3);
  exact('round(7/3)', '2');
  exact('floor(-7/3)', '-3');
  exact('ceil(7/3)', '3');
  fails('tan(90)');
  fails('asin(2)');
});

test('ошибки', () => {
  fails('1/0');
  fails('sqrt(-1)');
  fails('0^-1');
  fails('log(0)');
  fails('1+');
  fails('(1+2');
  fails('2^');
});

test('форматирование', () => {
  const third = describeValue(evaluate('1/3'));
  assert.equal(third.fraction, '1/3');
  assert.equal(third.decimal, '0,333333333333');
  assert.equal(third.exactDecimal, false);

  const eighth = describeValue(evaluate('1/8'));
  assert.equal(eighth.decimal, '0,125');
  assert.equal(eighth.exactDecimal, true);

  const mixed = describeValue(evaluate('10/4'));
  assert.equal(mixed.fraction, '5/2');
  assert.equal(mixed.mixed, '2 1/2');
  assert.equal(mixed.decimal, '2,5');
});

test('подготовка недописанного выражения', () => {
  assert.equal(prepareExpression('2*(3+4'), '2*(3+4)');
  assert.equal(prepareExpression('2+'), '2');
  assert.equal(prepareExpression('2+('), '2+(');
});
