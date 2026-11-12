import {
  evaluate,
  prepareExpression,
  preview,
  formatNumber,
  fractionString,
  describeValue
} from './math.js';

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const KEY = 'umnik.state.v2';
const BG_KEY = 'umnik.background.v1';
const MAX_HISTORY = 40;
const root = document.documentElement;

const THEMES = [
  {
    id: 'aurora', name: 'Аврора', vibe: 'космос и северное сияние', mode: 'dark',
    bg: ['#050916', '#0b1630', '#142a4a'], accent: ['#7de2ff', '#8b7cff'],
    text: '#f4f7ff', dim: '#a9b4cc', onAccent: '#04101f'
  },
  {
    id: 'sunset', name: 'Закат', vibe: 'тёплый вечерний свет', mode: 'dark',
    bg: ['#180a14', '#3a1226', '#6e2334'], accent: ['#ffb36b', '#ff6b9d'],
    text: '#fff4f1', dim: '#d8b4b8', onAccent: '#2a0a12'
  },
  {
    id: 'neon', name: 'Неон', vibe: 'кислотный киберпанк', mode: 'dark',
    bg: ['#04140c', '#0a2a18', '#15452a'], accent: ['#9bff6a', '#44e0b0'],
    text: '#f0fff6', dim: '#a4c9b4', onAccent: '#04140c'
  },
  {
    id: 'ocean', name: 'Океан', vibe: 'глубина и бриз', mode: 'dark',
    bg: ['#031018', '#062331', '#0b3d4f'], accent: ['#4fe3d0', '#4a9dff'],
    text: '#effbff', dim: '#9dbcc9', onAccent: '#032029'
  },
  {
    id: 'graphite', name: 'Графит', vibe: 'спокойный минимализм', mode: 'dark',
    bg: ['#0b0d12', '#151820', '#222733'], accent: ['#d7deea', '#8e9cb5'],
    text: '#f2f5fa', dim: '#9aa5b8', onAccent: '#10131a'
  },
  {
    id: 'lavender', name: 'Лаванда', vibe: 'нежная пастель', mode: 'light',
    bg: ['#f7f3ff', '#efe3ff', '#e2d1ff'], accent: ['#8b5cf6', '#d08cff'],
    text: '#2b1b45', dim: '#75658f', onAccent: '#ffffff'
  },
  {
    id: 'mint', name: 'Мята', vibe: 'свежий бриз', mode: 'light',
    bg: ['#f0fbf4', '#ddf7e7', '#c9f0da'], accent: ['#3fbf7f', '#8be0ae'],
    text: '#103528', dim: '#5c7d6c', onAccent: '#07301f'
  },
  {
    id: 'caramel', name: 'Карамель', vibe: 'уютное тепло', mode: 'light',
    bg: ['#fff8ec', '#ffe9c9', '#f7d5a5'], accent: ['#f09a3e', '#ffc46b'],
    text: '#40260f', dim: '#8a6a4c', onAccent: '#2b1604'
  },
  {
    id: 'rose', name: 'Роза', vibe: 'тёплый румянец', mode: 'light',
    bg: ['#fff5f7', '#ffe4ea', '#ffd2de'], accent: ['#e8557f', '#ff9a76'],
    text: '#431827', dim: '#8d5e6a', onAccent: '#ffffff'
  }
];

const DEFAULT_SETTINGS = { blur: 14, dim: 34, fill: 'cover', panel: 85, sound: true };

const state = {
  themeID: 'aurora',
  angleMode: 'deg',
  fractionMode: true,
  history: [],
  bestSprint: 0,
  bestLadder: 0,
  settings: Object.assign({}, DEFAULT_SETTINGS),
  expression: '',
  showingResult: false,
  resultValue: null,
  resultText: '0',
  resultChain: '',
  lastExpression: '',
  error: '',
  tableSize: 12,
  hideAnswers: false,
  tableFocus: 0,
  revealed: {},
  gameMode: 'sprint',
  pendingTableFocus: 0
};

let navTab = 'calculator';
let toastTimer = 0;
let saveTimer = 0;
let audioContext = null;
let game = null;
let gameClock = null;
let gamePending = 0;
let confettiFrame = 0;

const scenePhoto = $('#scenePhoto');
const themeColor = $('#themeColor');
const display = $('#calcDisplay');
const displayExpression = $('#displayExpression');
const displayMain = $('#displayMain');
const displaySub = $('#displaySub');
const angleToggle = $('#angleToggle');
const fractionToggle = $('#fractionToggle');
const historyList = $('#historyList');
const historyEmpty = $('#historyEmpty');
const historyCount = $('#historyCount');
const historyPanel = $('#historyPanel');
const historyToggleBtn = $('#historyToggle');
const historyCloseBtn = $('#historyClose');
const historyScrim = $('#historyScrim');
const clearHistoryBtn = $('#clearHistory');
const themeGrid = $('#themeGrid');
const themeCount = $('#themeCount');
const tableEl = $('#multTable');
const tableInfo = $('#tableInfo');
const hideAnswersBtn = $('#hideAnswers');
const tableSizeSelect = $('#tableSize');
const photoPreview = $('#photoPreview');
const photoImage = $('#photoImage');
const photoPlaceholder = $('#photoPlaceholder');
const photoCaption = $('#photoCaption');
const photoTag = $('#photoTag');
const removePhotoBtn = $('#removePhoto');
const bgFile = $('#bgFile');
const resetDialog = $('#resetDialog');
const toastEl = $('#toast');
const gameLobby = $('#gamesLobby');
const gameStage = $('#gameStage');
const gameResults = $('#gameResults');
const gameOptions = $('#gameOptions');

/* ----------------------------- utilities ----------------------------- */

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function shuffle(items) {
  const array = items.slice();
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = array[i];
    array[i] = array[j];
    array[j] = tmp;
  }
  return array;
}

function plural(n, forms) {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return forms[0];
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return forms[1];
  return forms[2];
}

function groupDigits(text) {
  const negative = text.charAt(0) === '-';
  const digits = negative ? text.slice(1) : text;
  let out = '';
  for (let i = 0; i < digits.length; i += 1) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += '\u00a0';
    out += digits.charAt(i);
  }
  return (negative ? '\u2212' : '') + out;
}

function groupFraction(text) {
  const slash = text.indexOf('/');
  if (slash < 0) return groupDigits(text);
  return groupDigits(text.slice(0, slash)) + '/' + groupDigits(text.slice(slash + 1));
}

function groupMixed(text) {
  const space = text.indexOf(' ');
  if (space < 0) return groupFraction(text);
  return groupDigits(text.slice(0, space)) + ' ' + groupFraction(text.slice(space + 1));
}

function formatValue(value, useFractions) {
  if (!value) return '0';
  try {
    if (!value.exact) return formatNumber(value.toNumber());
    const rational = value.rational;
    if (rational.d === 1n) return groupDigits(String(rational.n));
    if (useFractions) return groupDigits(String(rational.n)) + '/' + groupDigits(String(rational.d));
    return formatNumber(value.toNumber());
  } catch {
    return 'слишком большое';
  }
}

function plainValue(value) {
  if (!value) return '0';
  if (value.exact) {
    const text = fractionString(value);
    return text || formatValue(value, true).replace(/\u00a0/g, ' ');
  }
  return String(value.toNumber());
}

function valueSub(value, useFractions) {
  if (!value) return '\u0433\u043e\u0442\u043e\u0432 \u0441\u0447\u0438\u0442\u0430\u0442\u044c';
  try {
    if (!value.exact) return '\u2248 ' + formatNumber(value.toNumber());
    const info = describeValue(value);
    const fraction = info.fraction;
    if (fraction && fraction.indexOf('/') >= 0) {
      if (!useFractions) return '= ' + groupFraction(fraction);
      const parts = [];
      if (info.mixed && info.mixed !== fraction) parts.push('= ' + groupMixed(info.mixed));
      if (info.decimal && info.decimal !== '\u2014') {
        parts.push((info.exactDecimal ? '= ' : '\u2248 ') + info.decimal);
      }
      return parts.length ? parts.join(' \u00b7 ') : '\u0442\u043e\u0447\u043d\u0430\u044f \u0434\u0440\u043e\u0431\u044c';
    }
    if (info.fraction) return '\u0442\u043e\u0447\u043d\u043e\u0435 \u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0435';
    return '\u043f\u0440\u0438\u0431\u043b\u0438\u0436\u0451\u043d\u043d\u043e';
  } catch {
    return '\u0442\u043e\u0447\u043d\u0430\u044f \u0434\u0440\u043e\u0431\u044c';
  }
}

function makeChain(value) {
  if (!value) return '';
  let text = plainValue(value);
  if (text.charAt(0) === '-') text = '(' + text + ')';
  else if (text.indexOf('/') >= 0) text = '(' + text + ')';
  return text;
}

function prettyExpression(expression) {
  if (!expression) return '';
  let text = String(expression);
  text = text.replace(/sqrt\(/g, '\u221a(');
  text = text.replace(/cbrt\(/g, '\u221b(');
  text = text.replace(/pi/g, '\u03c0');
  text = text.replace(/\*/g, ' \u00d7 ');
  text = text.replace(/\//g, ' \u00f7 ');
  text = text.replace(/\+/g, ' + ');
  text = text.replace(/-/g, ' \u2212 ');
  text = text.replace(/\^/g, ' ^ ');
  return text.replace(/\s+/g, ' ').trim();
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(function () {
    toastEl.classList.remove('is-visible');
  }, 2400);
}

/* ----------------------------- storage ----------------------------- */

function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved && typeof saved === 'object') {
      if (saved.themeID && THEMES.some(function (theme) { return theme.id === saved.themeID; })) {
        state.themeID = saved.themeID;
      }
      if (saved.angleMode === 'rad' || saved.angleMode === 'deg') state.angleMode = saved.angleMode;
      if (typeof saved.fractionMode === 'boolean') state.fractionMode = saved.fractionMode;
      if (Array.isArray(saved.history)) {
        state.history = saved.history.filter(function (item) {
          return item && typeof item.input === 'string' && typeof item.text === 'string';
        }).slice(0, MAX_HISTORY);
      }
      state.bestSprint = Number(saved.bestSprint) || 0;
      state.bestLadder = Number(saved.bestLadder) || 0;
      state.settings = Object.assign({}, DEFAULT_SETTINGS, saved.settings || {});
      state.settings.blur = clamp(Number(state.settings.blur) || 0, 0, 40);
      state.settings.dim = clamp(Number(state.settings.dim) || 0, 0, 85);
      state.settings.panel = clamp(Number(state.settings.panel) || 85, 45, 100);
      state.settings.fill = state.settings.fill === 'contain' ? 'contain' : 'cover';
      state.settings.sound = state.settings.sound !== false;
    }
  } catch {
    /* Битое сохранение просто игнорируем. */
  }
}

function saveState() {
  const payload = {
    themeID: state.themeID,
    angleMode: state.angleMode,
    fractionMode: state.fractionMode,
    history: state.history.slice(0, MAX_HISTORY),
    bestSprint: state.bestSprint,
    bestLadder: state.bestLadder,
    settings: state.settings
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* В приватном режиме память может быть недоступна. */
  }
}

function saveSoon() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(saveState, 180);
}

/* ----------------------------- themes ----------------------------- */

function selectTheme(id) {
  const theme = THEMES.find(function (item) { return item.id === id; });
  if (!theme) return;
  state.themeID = theme.id;
  applyTheme(theme);
  renderThemeGrid();
  saveState();
}

function applyTheme(theme) {
  const dark = theme.mode === 'dark';
  root.dataset.theme = theme.id;
  root.dataset.mode = theme.mode;
  root.style.setProperty('--bg-1', theme.bg[0]);
  root.style.setProperty('--bg-2', theme.bg[1]);
  root.style.setProperty('--bg-3', theme.bg[2]);
  root.style.setProperty('--accent-1', theme.accent[0]);
  root.style.setProperty('--accent-2', theme.accent[1]);
  root.style.setProperty('--text', theme.text);
  root.style.setProperty('--dim', theme.dim);
  root.style.setProperty('--on-accent', theme.onAccent);
  root.style.setProperty('--glass-rgb', '255 255 255');
  root.style.setProperty('--glass-alpha', dark ? '0.078' : '0.60');
  root.style.setProperty('--hairline', dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.72)');
  root.style.setProperty('--shadow', dark ? '0 24px 60px rgba(0,0,0,0.35)' : '0 20px 50px rgba(45,60,85,0.15)');
  root.style.setProperty('--tabs-bg', dark ? 'rgba(5,9,22,0.34)' : 'rgba(255,255,255,0.42)');
  root.style.setProperty('--display-bg', dark ? 'rgba(0,0,0,0.17)' : 'rgba(255,255,255,0.36)');
  root.style.setProperty('--field-bg', dark ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.34)');
  root.style.setProperty('--key-bg', dark ? 'rgba(255,255,255,0.065)' : 'rgba(255,255,255,0.50)');
  root.style.setProperty('--btn-bg', dark ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.40)');
  root.style.setProperty('--success', dark ? '#4ade80' : '#1f9d55');
  root.style.setProperty('--danger', dark ? '#ff6b81' : '#d93a57');
  themeColor.setAttribute('content', theme.bg[0]);
}

function renderThemeGrid() {
  themeGrid.replaceChildren();
  themeCount.textContent = THEMES.length + ' \u043e\u0431\u0440\u0430\u0437\u043e\u0432';
  THEMES.forEach(function (theme) {
    const active = theme.id === state.themeID;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'theme-card' + (active ? ' is-active' : '');
    card.dataset.theme = theme.id;
    card.setAttribute('aria-pressed', active ? 'true' : 'false');
    card.setAttribute('aria-label', theme.name + ' — ' + theme.vibe);

    const preview = document.createElement('span');
    preview.className = 'theme-preview';
    preview.style.background = 'linear-gradient(145deg, ' + theme.bg[0] + ', ' + theme.bg[1] + ' 58%, ' + theme.bg[2] + ')';
    preview.style.color = theme.text;
    preview.style.setProperty('--t-accent', theme.accent[0]);
    preview.style.setProperty('--t-on-accent', theme.onAccent);

    const label = document.createElement('span');
    label.className = 'theme-mini-label';
    label.textContent = '7 \u00d7 8';
    const value = document.createElement('b');
    value.className = 'theme-mini-value';
    value.textContent = '56';
    const bars = document.createElement('span');
    bars.className = 'theme-mini-bars';
    for (let i = 0; i < 3; i += 1) bars.appendChild(document.createElement('i'));
    preview.appendChild(label);
    preview.appendChild(value);
    preview.appendChild(bars);

    if (active) {
      const check = document.createElement('span');
      check.className = 'theme-check';
      check.innerHTML = '<svg class="icon"><use href="#i-check"></use></svg>';
      preview.appendChild(check);
    }

    const name = document.createElement('span');
    name.className = 'theme-name';
    name.textContent = theme.name;
    const vibe = document.createElement('span');
    vibe.className = 'theme-vibe';
    vibe.textContent = theme.vibe;

    card.appendChild(preview);
    card.appendChild(name);
    card.appendChild(vibe);
    card.addEventListener('click', function () { selectTheme(theme.id); });
    themeGrid.appendChild(card);
  });
}

function cycleTheme() {
  const index = THEMES.findIndex(function (theme) { return theme.id === state.themeID; });
  const next = THEMES[(index + 1) % THEMES.length];
  selectTheme(next.id);
  showToast('\u0422\u0435\u043c\u0430: ' + next.name);
}

/* ----------------------------- settings / photo ----------------------------- */

function applySettings() {
  const settings = state.settings;
  root.style.setProperty('--photo-blur', settings.blur + 'px');
  root.style.setProperty('--photo-dim', String(settings.dim / 100));
  root.style.setProperty('--panel-opacity', String(settings.panel / 100));

  const blurRange = $('#blurRange');
  const dimRange = $('#dimRange');
  const opacityRange = $('#opacityRange');
  blurRange.value = String(settings.blur);
  dimRange.value = String(settings.dim);
  opacityRange.value = String(settings.panel);
  $('#blurValue').textContent = String(settings.blur);
  $('#dimValue').textContent = settings.dim + '%';
  $('#opacityValue').textContent = settings.panel + '%';
  syncRangeFill(blurRange);
  syncRangeFill(dimRange);
  syncRangeFill(opacityRange);

  $$('#fillPicker button').forEach(function (button) {
    const active = button.dataset.fill === settings.fill;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  const soundToggle = $('#soundToggle');
  soundToggle.classList.toggle('is-on', settings.sound);
  soundToggle.setAttribute('aria-checked', settings.sound ? 'true' : 'false');

  applyPhotoFit();
}

function syncRangeFill(input) {
  const min = Number(input.min) || 0;
  const max = Number(input.max) || 100;
  const value = Number(input.value) || 0;
  const percent = ((value - min) / (max - min)) * 100;
  input.style.setProperty('--fill', percent + '%');
}

function applyPhotoFit() {
  const fit = state.settings.fill === 'contain' ? 'contain' : 'cover';
  scenePhoto.style.backgroundSize = fit;
}

function applyBackground(data) {
  if (data) {
    scenePhoto.style.backgroundImage = 'url("' + data + '")';
    root.style.setProperty('--photo-opacity', '1');
    photoImage.src = data;
    photoImage.hidden = false;
    photoPlaceholder.hidden = true;
    photoCaption.hidden = false;
    photoTag.hidden = false;
    removePhotoBtn.hidden = false;
  } else {
    scenePhoto.style.backgroundImage = 'none';
    root.style.setProperty('--photo-opacity', '0');
    photoImage.removeAttribute('src');
    photoImage.hidden = true;
    photoPlaceholder.hidden = false;
    photoCaption.hidden = true;
    photoTag.hidden = true;
    removePhotoBtn.hidden = true;
  }
  applyPhotoFit();
}

function importPhoto(file) {
  if (!file) return;
  if (!file.type || file.type.indexOf('image/') !== 0) {
    showToast('\u042d\u0442\u043e \u043d\u0435 \u043a\u0430\u0440\u0442\u0438\u043d\u043a\u0430');
    return;
  }
  const reader = new FileReader();
  reader.onerror = function () { showToast('\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u0440\u043e\u0447\u0438\u0442\u0430\u0442\u044c \u0444\u0430\u0439\u043b'); };
  reader.onload = function () {
    const image = new Image();
    image.onerror = function () { showToast('\u0424\u043e\u0440\u043c\u0430\u0442 \u0444\u043e\u0442\u043e \u043d\u0435 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044f'); };
    image.onload = function () {
      const maxSide = 1800;
      let width = image.naturalWidth || image.width;
      let height = image.naturalHeight || image.height;
      if (Math.max(width, height) > maxSide) {
        const ratio = maxSide / Math.max(width, height);
        width = Math.max(1, Math.round(width * ratio));
        height = Math.max(1, Math.round(height * ratio));
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) {
        showToast('\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0431\u0440\u0430\u0431\u043e\u0442\u0430\u0442\u044c \u0444\u043e\u0442\u043e');
        return;
      }
      context.fillStyle = '#000';
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      let data = '';
      try {
        data = canvas.toDataURL('image/jpeg', 0.84);
      } catch {
        showToast('\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0431\u0440\u0430\u0431\u043e\u0442\u0430\u0442\u044c \u0444\u043e\u0442\u043e');
        return;
      }
      let saved = true;
      try {
        localStorage.setItem(BG_KEY, data);
      } catch {
        saved = false;
      }
      applyBackground(data);
      showToast(saved ? '\u0424\u043e\u043d \u043e\u0431\u043d\u043e\u0432\u043b\u0451\u043d' : '\u0424\u043e\u043d \u043f\u0440\u0438\u043c\u0435\u043d\u0451\u043d, \u043d\u043e \u043d\u0435 \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u043b\u0441\u044f');
    };
    image.src = String(reader.result);
  };
  reader.readAsDataURL(file);
}

function removeBackground() {
  try { localStorage.removeItem(BG_KEY); } catch { /* ignore */ }
  applyBackground(null);
  showToast('\u0424\u043e\u0442\u043e \u0443\u0431\u0440\u0430\u043d\u043e');
}

/* ----------------------------- calculator ----------------------------- */

function updateDisplay() {
  display.classList.toggle('is-error', Boolean(state.error));
  if (state.error) {
    displayExpression.textContent = prettyExpression(state.lastExpression || state.expression);
    displayMain.textContent = '\u041e\u0448\u0438\u0431\u043a\u0430';
    displaySub.textContent = state.error;
    return;
  }

  if (state.showingResult && state.resultValue) {
    displayExpression.textContent = prettyExpression(state.lastExpression) + ' =';
    displayMain.textContent = formatValue(state.resultValue, state.fractionMode);
    displaySub.textContent = valueSub(state.resultValue, state.fractionMode);
    return;
  }

  const expression = state.expression;
  displayExpression.textContent = prettyExpression(expression);
  if (!expression) {
    displayMain.textContent = '0';
    displaySub.textContent = '\u0433\u043e\u0442\u043e\u0432 \u0441\u0447\u0438\u0442\u0430\u0442\u044c';
    return;
  }

  const incomplete = /[+\-*/^(]$/.test(expression);
  const value = incomplete ? null : preview(expression, state.angleMode);
  if (value) {
    displayMain.textContent = formatValue(value, state.fractionMode);
    if (value.exact && value.rational.d !== 1n) {
      const info = describeValue(value);
      if (!state.fractionMode) displaySub.textContent = '= ' + groupFraction(info.fraction || '');
      else if (info.decimal && info.decimal !== '\u2014') {
        displaySub.textContent = (info.exactDecimal ? '= ' : '\u2248 ') + info.decimal;
      } else {
        displaySub.textContent = valueSub(value, true);
      }
    } else if (value.exact) {
      displaySub.textContent = '\u043d\u0430\u0436\u043c\u0438 =, \u0447\u0442\u043e\u0431\u044b \u043f\u043e\u0441\u0447\u0438\u0442\u0430\u0442\u044c';
    } else {
      displaySub.textContent = '\u2248 ' + formatNumber(value.toNumber());
    }
  } else {
    displayMain.textContent = prettyExpression(expression) || '0';
    displaySub.textContent = incomplete ? '\u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0430\u0439\u2026' : '\u0436\u0438\u0432\u043e\u0439 \u0432\u0432\u043e\u0434';
  }
}

function afterEdit() {
  state.error = '';
  updateDisplay();
}

function clearCalculator() {
  state.expression = '';
  state.showingResult = false;
  state.resultValue = null;
  state.resultText = '0';
  state.resultChain = '';
  state.lastExpression = '';
  state.error = '';
  updateDisplay();
}

function insertToken(token) {
  if (state.error) {
    state.expression = '';
    state.error = '';
    state.showingResult = false;
    state.resultValue = null;
  }

  if (state.showingResult) {
    const chainable = '+-*/^!%'.indexOf(token) >= 0;
    if (chainable) {
      state.expression = state.resultChain + token;
    } else {
      state.expression = '';
    }
    state.showingResult = false;
    state.resultValue = null;
    state.lastExpression = '';
  }

  const expression = state.expression;
  const operators = '+-*/^';

  if (token === '.') {
    if (/[)!%]$/.test(expression)) return;
    const lastNumber = expression.split(/[+\-*/^()!%]/).pop() || '';
    if (lastNumber.indexOf('.') >= 0) return;
    if (!expression || /[+\-*/^(]$/.test(expression)) state.expression += '0.';
    else state.expression += '.';
  } else if (token === '(') {
    state.expression += '(';
  } else if (token === ')') {
    const open = (expression.match(/\(/g) || []).length;
    const close = (expression.match(/\)/g) || []).length;
    if (open <= close) return;
    if (!expression || /[+\-*/^(]$/.test(expression)) return;
    state.expression += ')';
  } else if (token === '!' || token === '%') {
    if (!expression || /[+\-*/^(]$/.test(expression)) return;
    if (token === '!' && /[!%]$/.test(expression)) return;
    state.expression += token;
  } else if (operators.indexOf(token) >= 0) {
    if (!expression) {
      if (token === '-') state.expression = '-';
      return;
    }
    const last = expression.slice(-1);
    if (operators.indexOf(last) >= 0) {
      if (token === '-' && '*/^'.indexOf(last) >= 0) state.expression += '-';
      else state.expression = expression.slice(0, -1) + token;
      updateDisplay();
      return;
    }
    if (last === '(') {
      if (token === '-') state.expression += '-';
      return;
    }
    state.expression += token;
  } else if (token === 'pi' || token === 'e' || /[a-z]\($/.test(token)) {
    state.expression += token;
  } else {
    state.expression += token;
  }

  afterEdit();
}

function backspace() {
  if (state.error) {
    clearCalculator();
    return;
  }
  if (state.showingResult) {
    clearCalculator();
    return;
  }
  if (!state.expression) return;
  if (state.expression.endsWith('pi')) {
    state.expression = state.expression.slice(0, -2);
  } else {
    const match = state.expression.match(/(sin|cos|tan|asin|acos|atan|sqrt|cbrt|log10|log2|ln|log|abs|round|floor|ceil|exp|sign)\($/);
    if (match) state.expression = state.expression.slice(0, -match[0].length);
    else state.expression = state.expression.slice(0, -1);
  }
  afterEdit();
}

function toggleSign() {
  if (state.showingResult && state.resultValue) {
    state.resultValue = state.resultValue.neg();
    state.resultText = formatValue(state.resultValue, state.fractionMode);
    state.resultChain = makeChain(state.resultValue);
    state.lastExpression = '-(' + state.lastExpression + ')';
    updateDisplay();
    return;
  }
  if (!state.expression) {
    state.expression = '-';
  } else if (state.expression.charAt(0) === '-') {
    state.expression = state.expression.slice(1);
  } else {
    state.expression = '-' + state.expression;
  }
  afterEdit();
}

function wrapPower(power) {
  if (state.showingResult) {
    state.expression = '(' + state.resultChain + ')^' + power;
    state.showingResult = false;
    state.resultValue = null;
    state.lastExpression = '';
  } else if (state.expression) {
    state.expression = '(' + state.expression + ')^' + power;
  } else {
    state.expression = '^' + power;
  }
  afterEdit();
}

function invertValue() {
  if (state.showingResult) {
    state.expression = '1/(' + state.resultChain + ')';
    state.showingResult = false;
    state.resultValue = null;
    state.lastExpression = '';
  } else if (state.expression) {
    state.expression = '1/(' + state.expression + ')';
  } else {
    state.expression = '1/';
  }
  afterEdit();
}

function commitCalculation() {
  if (state.showingResult) return;
  const raw = state.expression.trim();
  if (!raw) return;
  const prepared = prepareExpression(raw);
  if (!prepared) return;
  try {
    const value = evaluate(prepared, state.angleMode);
    state.resultValue = value;
    state.showingResult = true;
    state.lastExpression = raw;
    state.error = '';
    state.resultText = formatValue(value, state.fractionMode);
    state.resultChain = makeChain(value);
    const sub = valueSub(value, state.fractionMode);

    const entry = { input: raw, text: state.resultText, sub: sub, at: Date.now() };
    const first = state.history[0];
    if (!first || first.input !== entry.input || first.text !== entry.text) {
      state.history.unshift(entry);
      state.history = state.history.slice(0, MAX_HISTORY);
    }
    saveState();
    renderHistory();
    updateDisplay();
    tone(560, 0.05, 'sine', 0.025);
  } catch (error) {
    state.error = error && error.message ? error.message : '\u041d\u0435 \u043f\u043e\u043b\u0443\u0447\u0438\u043b\u043e\u0441\u044c \u043f\u043e\u0441\u0447\u0438\u0442\u0430\u0442\u044c';
    state.showingResult = false;
    state.resultValue = null;
    updateDisplay();
    tone(180, 0.12, 'triangle', 0.035);
  }
}

function renderHistory() {
  historyList.replaceChildren();
  historyEmpty.hidden = state.history.length > 0;
  historyCount.textContent = state.history.length ? state.history.length + ' ' + plural(state.history.length, ['\u0432\u044b\u0447\u0438\u0441\u043b\u0435\u043d\u0438\u0435', '\u0432\u044b\u0447\u0438\u0441\u043b\u0435\u043d\u0438\u044f', '\u0432\u044b\u0447\u0438\u0441\u043b\u0435\u043d\u0438\u0439']) : '\u043f\u043e\u043a\u0430 \u043f\u0443\u0441\u0442\u043e';
  clearHistoryBtn.disabled = state.history.length === 0;
  clearHistoryBtn.style.opacity = state.history.length === 0 ? '0.35' : '1';

  state.history.forEach(function (entry) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'history-item';
    button.title = '\u0412\u0435\u0440\u043d\u0443\u0442\u044c \u0432\u044b\u0440\u0430\u0436\u0435\u043d\u0438\u0435';
    const expression = document.createElement('span');
    expression.className = 'history-expression';
    expression.textContent = prettyExpression(entry.input);
    const result = document.createElement('span');
    result.className = 'history-result';
    result.textContent = entry.text;
    button.appendChild(expression);
    button.appendChild(result);
    button.addEventListener('click', function () {
      state.expression = entry.input;
      state.showingResult = false;
      state.resultValue = null;
      state.lastExpression = '';
      state.error = '';
      updateDisplay();
      closeHistory();
      showToast('\u0412\u044b\u0440\u0430\u0436\u0435\u043d\u0438\u0435 \u0432\u0435\u0440\u043d\u0443\u043b\u043e\u0441\u044c');
    });
    historyList.appendChild(button);
  });
}

function clearHistory() {
  if (!state.history.length) return;
  state.history = [];
  saveState();
  renderHistory();
  showToast('\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u043e\u0447\u0438\u0449\u0435\u043d\u0430');
}

function openHistory() {
  historyPanel.classList.add('is-open');
  historyScrim.classList.add('is-open');
  historyToggleBtn.setAttribute('aria-expanded', 'true');
  document.body.classList.add('history-open');
}

function closeHistory() {
  if (!historyPanel.classList.contains('is-open')) return;
  historyPanel.classList.remove('is-open');
  historyScrim.classList.remove('is-open');
  historyToggleBtn.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('history-open');
}

function toggleHistory() {
  if (historyPanel.classList.contains('is-open')) closeHistory();
  else openHistory();
}

async function copyResult() {
  let text = state.showingResult && state.resultValue ? plainValue(state.resultValue) : (state.expression || '0');
  text = text.replace(/\u00a0/g, ' ');
  try {
    await navigator.clipboard.writeText(text);
    showToast('\u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d\u043e: ' + text);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand('copy');
      showToast('\u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d\u043e: ' + text);
    } catch {
      showToast('\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c');
    }
    document.body.removeChild(area);
  }
}

/* ----------------------------- multiplication table ----------------------------- */

function renderTable() {
  const n = state.tableSize;
  tableEl.style.setProperty('--n', String(n));
  tableEl.replaceChildren();
  const fragment = document.createDocumentFragment();

  const corner = document.createElement('div');
  corner.className = 'table-cell corner';
  corner.textContent = '\u00d7';
  fragment.appendChild(corner);

  for (let column = 1; column <= n; column += 1) {
    const head = document.createElement('button');
    head.type = 'button';
    head.className = 'table-cell head-cell' + (state.tableFocus === column ? ' is-focus' : '');
    head.dataset.row = '0';
    head.dataset.column = String(column);
    head.textContent = String(column);
    head.setAttribute('aria-label', '\u0422\u0430\u0431\u043b\u0438\u0446\u0430 \u043d\u0430 ' + column);
    fragment.appendChild(head);
  }

  for (let row = 1; row <= n; row += 1) {
    const head = document.createElement('button');
    head.type = 'button';
    head.className = 'table-cell head-cell' + (state.tableFocus === row ? ' is-focus' : '');
    head.dataset.row = String(row);
    head.dataset.column = '0';
    head.textContent = String(row);
    head.setAttribute('aria-label', '\u0422\u0430\u0431\u043b\u0438\u0446\u0430 \u043d\u0430 ' + row);
    fragment.appendChild(head);

    for (let column = 1; column <= n; column += 1) {
      const product = row * column;
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'table-cell num';
      cell.dataset.row = String(row);
      cell.dataset.column = String(column);
      cell.style.setProperty('--heat', String(product / (n * n)));
      if (state.tableFocus === row || state.tableFocus === column) cell.classList.add('is-focus');

      const key = row * 100 + column;
      const hidden = state.hideAnswers && !state.revealed[key];
      if (hidden) {
        cell.classList.add('is-hidden');
        cell.textContent = '?';
        cell.setAttribute('aria-label', row + ' \u00d7 ' + column + ', \u043e\u0442\u0432\u0435\u0442 \u0441\u043a\u0440\u044b\u0442');
      } else {
        cell.textContent = String(product);
        cell.setAttribute('aria-label', row + ' \u00d7 ' + column + ' = ' + product);
      }
      fragment.appendChild(cell);
    }
  }

  tableEl.appendChild(fragment);
  updateTableInfo();
}

function updateTableInfo(text) {
  if (text) {
    tableInfo.textContent = text;
    return;
  }
  if (state.tableFocus > 0) {
    tableInfo.textContent = '\u0422\u0430\u0431\u043b\u0438\u0446\u0430 \u043d\u0430 ' + state.tableFocus + ' \u00b7 \u043d\u0430\u0436\u043c\u0438 \u043d\u0430 \u043a\u043b\u0435\u0442\u043a\u0443, \u0447\u0442\u043e\u0431\u044b \u0443\u0432\u0438\u0434\u0435\u0442\u044c \u043f\u0440\u0438\u043c\u0435\u0440';
  } else {
    tableInfo.textContent = '\u041d\u0430\u0436\u043c\u0438 \u043d\u0430 \u043b\u044e\u0431\u0443\u044e \u043a\u043b\u0435\u0442\u043a\u0443';
  }
}

function clearTableHover() {
  $$('.table-cell.is-cross, .table-cell.is-hover', tableEl).forEach(function (cell) {
    cell.classList.remove('is-cross');
    cell.classList.remove('is-hover');
  });
  updateTableInfo();
}

function handleTableHover(event) {
  const cell = event.target.closest('.table-cell');
  if (!cell || cell.classList.contains('corner')) return;
  const row = Number(cell.dataset.row);
  const column = Number(cell.dataset.column);
  $$('.table-cell.is-cross, .table-cell.is-hover', tableEl).forEach(function (item) {
    item.classList.remove('is-cross');
    item.classList.remove('is-hover');
  });
  if (row === 0 && column === 0) return;
  if (row === 0) {
    $$('.table-cell[data-column="' + column + '"]', tableEl).forEach(function (item) { item.classList.add('is-cross'); });
    updateTableInfo('\u0422\u0430\u0431\u043b\u0438\u0446\u0430 \u043d\u0430 ' + column + ' \u00b7 \u043d\u0430\u0436\u043c\u0438, \u0447\u0442\u043e\u0431\u044b \u0437\u0430\u043a\u0440\u0435\u043f\u0438\u0442\u044c');
  } else if (column === 0) {
    $$('.table-cell[data-row="' + row + '"]', tableEl).forEach(function (item) { item.classList.add('is-cross'); });
    updateTableInfo('\u0422\u0430\u0431\u043b\u0438\u0446\u0430 \u043d\u0430 ' + row + ' \u00b7 \u043d\u0430\u0436\u043c\u0438, \u0447\u0442\u043e\u0431\u044b \u0437\u0430\u043a\u0440\u0435\u043f\u0438\u0442\u044c');
  } else {
    cell.classList.add('is-hover');
    $$('.table-cell[data-row="' + row + '"]', tableEl).forEach(function (item) { item.classList.add('is-cross'); });
    $$('.table-cell[data-column="' + column + '"]', tableEl).forEach(function (item) { item.classList.add('is-cross'); });
    updateTableInfo(row + ' \u00d7 ' + column + ' = ' + (row * column));
  }
}

function handleTableClick(event) {
  const cell = event.target.closest('.table-cell');
  if (!cell || cell.classList.contains('corner')) return;
  const row = Number(cell.dataset.row);
  const column = Number(cell.dataset.column);
  if (row === 0 && column === 0) return;

  if (row > 0 && column > 0 && state.hideAnswers) {
    const key = row * 100 + column;
    if (!state.revealed[key]) {
      state.revealed[key] = true;
      renderTable();
      updateTableInfo(row + ' \u00d7 ' + column + ' = ' + (row * column));
      return;
    }
  }

  state.tableFocus = row === 0 ? column : row;
  renderTable();
  if (row > 0 && column > 0) updateTableInfo(row + ' \u00d7 ' + column + ' = ' + (row * column));
  else updateTableInfo();
}

function toggleAnswers() {
  state.hideAnswers = !state.hideAnswers;
  state.revealed = {};
  hideAnswersBtn.classList.toggle('is-active', state.hideAnswers);
  hideAnswersBtn.setAttribute('aria-pressed', state.hideAnswers ? 'true' : 'false');
  const label = hideAnswersBtn.querySelector('span');
  if (label) label.textContent = state.hideAnswers ? '\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u043e\u0442\u0432\u0435\u0442\u044b' : '\u0421\u043a\u0440\u044b\u0442\u044c \u043e\u0442\u0432\u0435\u0442\u044b';
  const iconUse = hideAnswersBtn.querySelector('use');
  if (iconUse) iconUse.setAttribute('href', state.hideAnswers ? '#i-eye-off' : '#i-eye');
  renderTable();
}

function resetTable() {
  state.tableFocus = 0;
  state.hideAnswers = false;
  state.revealed = {};
  hideAnswersBtn.classList.remove('is-active');
  hideAnswersBtn.setAttribute('aria-pressed', 'false');
  const label = hideAnswersBtn.querySelector('span');
  if (label) label.textContent = '\u0421\u043a\u0440\u044b\u0442\u044c \u043e\u0442\u0432\u0435\u0442\u044b';
  const iconUse = hideAnswersBtn.querySelector('use');
  if (iconUse) iconUse.setAttribute('href', '#i-eye');
  renderTable();
}

/* ----------------------------- sound ----------------------------- */

function ensureAudio() {
  if (!state.settings.sound) return null;
  try {
    if (!audioContext) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return null;
      audioContext = new Context();
    }
    if (audioContext.state === 'suspended') audioContext.resume();
    return audioContext;
  } catch {
    return null;
  }
}

function tone(frequency, duration, type, volume, delay) {
  if (!state.settings.sound) return;
  const context = ensureAudio();
  if (!context) return;
  try {
    const start = context.currentTime + (delay || 0);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type || 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume || 0.03), start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  } catch {
    /* звук не критичен */
  }
}

function soundCorrect() {
  tone(620, 0.07, 'sine', 0.035);
  tone(880, 0.11, 'sine', 0.03, 0.055);
}

function soundWrong() {
  tone(190, 0.16, 'triangle', 0.035);
  tone(145, 0.14, 'triangle', 0.025, 0.07);
}

function soundFinish() {
  tone(523, 0.12, 'sine', 0.03);
  tone(659, 0.12, 'sine', 0.03, 0.1);
  tone(784, 0.2, 'sine', 0.03, 0.2);
}

/* ----------------------------- game model ----------------------------- */

class Game {
  constructor() {
    this.mode = 'sprint';
    this.phase = 'lobby';
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.correct = 0;
    this.total = 0;
    this.lives = 3;
    this.timeLeft = 60;
    this.number = 0;
    this.question = null;
    this.selected = -1;
    this.locked = false;
    this.lastKey = '';
  }

  start(mode) {
    this.mode = mode === 'ladder' ? 'ladder' : 'sprint';
    this.phase = 'playing';
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.correct = 0;
    this.total = 0;
    this.lives = 3;
    this.timeLeft = 60;
    this.number = 0;
    this.selected = -1;
    this.locked = false;
    this.lastKey = '';
    this.nextQuestion();
  }

  makeQuestion() {
    let min = 2;
    let max = 12;
    if (this.mode === 'ladder') {
      const tier = Math.min(3, Math.floor(this.total / 3));
      const ranges = [[2, 5], [2, 7], [3, 9], [4, 12]];
      min = ranges[tier][0];
      max = ranges[tier][1];
    }
    let a = randomInt(min, max);
    let b = randomInt(min, max);
    let guard = 0;
    while (String(a) + 'x' + String(b) === this.lastKey && guard < 12) {
      a = randomInt(min, max);
      b = randomInt(min, max);
      guard += 1;
    }
    this.lastKey = String(a) + 'x' + String(b);
    const answer = a * b;
    const candidates = [];
    const add = function (value) {
      if (Number.isInteger(value) && value > 0 && value !== answer && candidates.indexOf(value) < 0) candidates.push(value);
    };
    add(a * (b + 1));
    add(a * (b - 1));
    add((a + 1) * b);
    add((a - 1) * b);
    add(answer + 1);
    add(answer - 1);
    add(answer + 2);
    add(answer - 2);
    add(answer + 10);
    add(answer - 10);
    add(answer + a);
    add(answer - a);
    add(answer + b);
    add(answer - b);
    let options = shuffle(candidates).slice(0, 3);
    let extraGuard = 0;
    while (options.length < 3 && extraGuard < 30) {
      add(randomInt(1, 144));
      options = shuffle(candidates).slice(0, 3);
      extraGuard += 1;
    }
    options.push(answer);
    return {
      id: this.number + 1,
      a: a,
      b: b,
      answer: answer,
      options: shuffle(options)
    };
  }

  nextQuestion() {
    this.number += 1;
    this.locked = false;
    this.selected = -1;
    this.question = this.makeQuestion();
  }

  choose(index) {
    if (this.phase !== 'playing' || this.locked || !this.question) return null;
    if (!Number.isInteger(index) || index < 0 || index >= this.question.options.length) return null;
    this.locked = true;
    this.selected = index;
    const correct = this.question.options[index] === this.question.answer;
    let gained = 0;
    if (correct) {
      this.streak += 1;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      this.correct += 1;
      const bonus = Math.min(Math.max(this.streak - 1, 0), 5);
      gained = this.mode === 'sprint' ? 10 + bonus * 2 : 14 + bonus * 3;
      this.score += gained;
    } else {
      this.streak = 0;
      if (this.mode === 'ladder') this.lives = Math.max(0, this.lives - 1);
    }
    this.total += 1;
    return { correct: correct, gained: gained, answer: this.question.answer };
  }

  tick(delta) {
    if (this.phase !== 'playing' || this.mode !== 'sprint') return false;
    this.timeLeft = Math.max(0, this.timeLeft - delta);
    if (this.timeLeft <= 0) {
      this.phase = 'finished';
      return true;
    }
    return false;
  }

  finish() {
    if (this.phase === 'playing') this.phase = 'finished';
  }

  abort() {
    this.phase = 'lobby';
    this.locked = true;
  }
}

/* ----------------------------- game UI ----------------------------- */

function renderLobbyRecords() {
  const sprint = state.bestSprint > 0 ? String(state.bestSprint) : '\u2014';
  const ladder = state.bestLadder > 0 ? String(state.bestLadder) : '\u2014';
  $('#bestSprint').textContent = sprint;
  $('#bestLadder').textContent = ladder;
  $('#cardBestSprint').textContent = sprint;
  $('#cardBestLadder').textContent = ladder;
}

function startGame(mode) {
  ensureAudio();
  window.clearTimeout(gamePending);
  stopConfetti();
  game = new Game();
  game.start(mode);
  gameLobby.hidden = true;
  gameResults.hidden = true;
  gameStage.hidden = false;
  renderGame(true);
  startGameClock();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function startGameClock() {
  stopGameClock();
  let last = performance.now();
  gameClock = window.setInterval(function () {
    if (!game || game.phase !== 'playing') return;
    const now = performance.now();
    const delta = Math.min(0.5, (now - last) / 1000);
    last = now;
    const ended = game.tick(delta);
    if (ended) {
      finishGame();
      return;
    }
    renderGame();
  }, 200);
}

function stopGameClock() {
  if (gameClock) {
    window.clearInterval(gameClock);
    gameClock = null;
  }
}

function renderGame(forceOptions) {
  if (!game || !game.question) return;
  const isSprint = game.mode === 'sprint';
  const question = game.question;

  $('#gameModeChip').textContent = isSprint ? '\u0421\u043f\u0440\u0438\u043d\u0442 60' : '\u041b\u0435\u0441\u0442\u043d\u0438\u0446\u0430';
  $('#gameScore').textContent = String(game.score);
  $('#gameStreak').textContent = String(game.streak);
  $('#streakStat').classList.toggle('streak-hot', game.streak >= 3);
  $('#questionKicker').textContent = isSprint ? '\u0423\u0421\u041f\u0415\u0419 \u0417\u0410 60 \u0421\u0415\u041a\u0423\u041d\u0414' : '\u0412\u041e\u041f\u0420\u041e\u0421 ' + game.number + ' / 12';
  $('#questionText').innerHTML = String(question.a) + ' \u00d7 ' + String(question.b) + ' = <em>?</em>';
  $('#gameFootBonus').textContent = isSprint ? '+10 \u043e\u0447\u043a\u043e\u0432 \u0437\u0430 \u043e\u0442\u0432\u0435\u0442' : '+14 \u043e\u0447\u043a\u043e\u0432 \u0437\u0430 \u043e\u0442\u0432\u0435\u0442';

  const timerWrap = $('#timerWrap');
  const lives = $('#gameLives');
  timerWrap.hidden = !isSprint;
  lives.hidden = isSprint;
  if (isSprint) {
    const seconds = Math.max(0, Math.ceil(game.timeLeft));
    $('#timerValue').textContent = String(seconds);
    const progress = Math.max(0, Math.min(1, game.timeLeft / 60));
    $('#timerRing').style.setProperty('--progress', String(progress));
    timerWrap.classList.toggle('timer-low', game.timeLeft <= 10);
    $('#gameProgress').style.width = String(((60 - game.timeLeft) / 60) * 100) + '%';
  } else {
    let hearts = '';
    for (let i = 0; i < 3; i += 1) {
      hearts += '<svg class="icon' + (i >= game.lives ? ' is-lost' : '') + '"><use href="#i-heart"></use></svg>';
    }
    lives.innerHTML = hearts;
    $('#gameProgress').style.width = String((game.total / 12) * 100) + '%';
  }

  const answerLine = $('#questionAnswer');
  answerLine.textContent = game.locked ? '= ' + question.answer : '';

  const correctIndex = question.options.indexOf(question.answer);
  if (forceOptions || gameOptions.dataset.questionId !== String(question.id)) {
    gameOptions.dataset.questionId = String(question.id);
    gameOptions.replaceChildren();
    question.options.forEach(function (option, index) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'game-option';
      button.dataset.index = String(index);
      const hint = document.createElement('span');
      hint.className = 'opt-index';
      hint.textContent = String(index + 1);
      button.appendChild(hint);
      button.appendChild(document.createTextNode(String(option)));
      gameOptions.appendChild(button);
    });
  }

  $$('.game-option', gameOptions).forEach(function (button, index) {
    button.classList.remove('is-correct', 'is-wrong', 'is-muted');
    if (!game.locked) return;
    if (index === correctIndex) button.classList.add('is-correct');
    if (index === game.selected && index !== correctIndex) button.classList.add('is-wrong');
    if (index !== game.selected && index !== correctIndex) button.classList.add('is-muted');
  });
}

function chooseAnswer(index) {
  if (!game || game.phase !== 'playing' || game.locked) return;
  const result = game.choose(index);
  if (!result) return;
  if (result.correct) {
    soundCorrect();
    if (result.gained > 10) showToast('+' + result.gained + ' \u0437\u0430 \u0441\u0435\u0440\u0438\u044e \u00d7' + game.streak);
  } else {
    soundWrong();
  }
  renderGame();
  window.clearTimeout(gamePending);
  const delay = result.correct ? 500 : 1300;
  gamePending = window.setTimeout(function () {
    if (!game || game.phase !== 'playing') return;
    if (game.mode === 'ladder' && (game.lives <= 0 || game.total >= 12)) {
      game.finish();
      finishGame();
      return;
    }
    game.nextQuestion();
    renderGame(true);
  }, delay);
}

function finishGame() {
  if (!game) return;
  if (game.phase !== 'finished') game.finish();
  stopGameClock();
  window.clearTimeout(gamePending);
  gameStage.hidden = true;
  gameResults.hidden = false;

  const isSprint = game.mode === 'sprint';
  const bestKey = isSprint ? 'bestSprint' : 'bestLadder';
  const previousBest = state[bestKey] || 0;
  const newRecord = game.score > previousBest;
  if (newRecord) {
    state[bestKey] = game.score;
    saveState();
  }
  renderLobbyRecords();

  $('#resultKicker').textContent = newRecord ? '\u041d\u041e\u0412\u042b\u0419 \u0420\u0415\u041a\u041e\u0420\u0414!' : '\u0417\u0410\u0411\u0415\u0413 \u041e\u041a\u041e\u041d\u0427\u0415\u041d';
  $('#resultScore').textContent = String(game.score);
  $('#resultCorrect').textContent = game.correct + '/' + game.total;
  $('#resultAccuracy').textContent = (game.total ? Math.round((game.correct / game.total) * 100) : 0) + '%';
  $('#resultStreak').textContent = String(game.bestStreak);
  soundFinish();
  fireConfetti();
}

function backToLobby() {
  stopGameClock();
  window.clearTimeout(gamePending);
  stopConfetti();
  if (game) game.phase = 'lobby';
  gameStage.hidden = true;
  gameResults.hidden = true;
  gameLobby.hidden = false;
  renderLobbyRecords();
}

function quitGame() {
  backToLobby();
}

function abandonGame() {
  if (!game) return;
  stopGameClock();
  window.clearTimeout(gamePending);
  stopConfetti();
  game.abort();
  gameStage.hidden = true;
  gameResults.hidden = true;
  gameLobby.hidden = false;
}

function resultToTable() {
  const focus = game && game.question ? game.question.a : 0;
  state.pendingTableFocus = focus;
  setTab('table');
}

/* ----------------------------- confetti ----------------------------- */

function stopConfetti() {
  if (confettiFrame) {
    cancelAnimationFrame(confettiFrame);
    confettiFrame = 0;
  }
  const canvas = $('#confetti');
  const context = canvas.getContext('2d');
  if (context) context.clearRect(0, 0, canvas.width, canvas.height);
}

function fireConfetti() {
  const canvas = $('#confetti');
  const context = canvas.getContext('2d');
  if (!context) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  context.setTransform(dpr, 0, 0, dpr, 0, 0);

  const styles = getComputedStyle(root);
  const colors = [
    styles.getPropertyValue('--accent-1').trim(),
    styles.getPropertyValue('--accent-2').trim(),
    styles.getPropertyValue('--success').trim(),
    '#ffffff'
  ];
  const particles = [];
  for (let i = 0; i < 80; i += 1) {
    particles.push({
      x: Math.random() * rect.width,
      y: -20 - Math.random() * rect.height * 0.35,
      w: 4 + Math.random() * 6,
      h: 6 + Math.random() * 8,
      vy: 60 + Math.random() * 130,
      vx: -35 + Math.random() * 70,
      rotation: Math.random() * Math.PI,
      spin: -2 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 0.7 + Math.random() * 0.3
    });
  }
  let start = 0;
  function frame(now) {
    if (!start) start = now;
    const elapsed = now - start;
    context.clearRect(0, 0, rect.width, rect.height);
    particles.forEach(function (particle) {
      particle.x += particle.vx / 60;
      particle.y += particle.vy / 60;
      particle.vy += 1.2;
      particle.rotation += particle.spin / 60;
      context.save();
      context.globalAlpha = Math.max(0, particle.alpha - elapsed / 4000);
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);
      context.fillStyle = particle.color;
      context.fillRect(-particle.w / 2, -particle.h / 2, particle.w, particle.h);
      context.restore();
    });
    if (elapsed < 3000) {
      confettiFrame = requestAnimationFrame(frame);
    } else {
      context.clearRect(0, 0, rect.width, rect.height);
      confettiFrame = 0;
    }
  }
  cancelAnimationFrame(confettiFrame);
  confettiFrame = requestAnimationFrame(frame);
}

/* ----------------------------- navigation ----------------------------- */

function setTab(tab, push) {
  const allowed = ['calculator', 'table', 'games', 'style'];
  if (allowed.indexOf(tab) < 0) tab = 'calculator';
  if (tab !== navTab) closeHistory();
  if (navTab === 'games' && tab !== 'games' && game && game.phase === 'playing') abandonGame();
  navTab = tab;

  $$('.view').forEach(function (view) {
    const active = view.dataset.view === tab;
    view.hidden = !active;
    view.classList.toggle('is-active', active);
  });
  $$('[data-tab]').forEach(function (button) {
    const active = button.dataset.tab === tab;
    button.classList.toggle('is-active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });

  if (tab === 'table') {
    if (state.pendingTableFocus > 0 && state.pendingTableFocus <= state.tableSize) {
      state.tableFocus = state.pendingTableFocus;
      state.pendingTableFocus = 0;
      renderTable();
    }
  }
  if (tab === 'games') {
    renderLobbyRecords();
  }

  if (push) {
    try {
      history.pushState({ tab: tab }, '', '#' + tab);
    } catch {
      location.hash = tab;
    }
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initialTab() {
  const hash = (location.hash || '').replace('#', '');
  return ['calculator', 'table', 'games', 'style'].indexOf(hash) >= 0 ? hash : 'calculator';
}

/* ----------------------------- reset ----------------------------- */

function resetEverything() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(BG_KEY);
  } catch {
    /* ignore */
  }
  stopGameClock();
  window.clearTimeout(gamePending);
  stopConfetti();
  game = null;
  state.themeID = 'aurora';
  state.angleMode = 'deg';
  state.fractionMode = true;
  state.history = [];
  state.bestSprint = 0;
  state.bestLadder = 0;
  state.settings = Object.assign({}, DEFAULT_SETTINGS);
  state.expression = '';
  state.showingResult = false;
  state.resultValue = null;
  state.resultChain = '';
  state.lastExpression = '';
  state.error = '';
  state.tableSize = 12;
  state.tableFocus = 0;
  state.hideAnswers = false;
  state.revealed = {};
  state.pendingTableFocus = 0;
  tableSizeSelect.value = '12';
  angleToggle.textContent = 'DEG';
  fractionToggle.classList.add('is-on');
  fractionToggle.setAttribute('aria-pressed', 'true');
  applyTheme(THEMES[0]);
  applySettings();
  applyBackground(null);
  renderThemeGrid();
  renderHistory();
  renderTable();
  renderLobbyRecords();
  clearCalculator();
  backToLobby();
  showToast('\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u0441\u0431\u0440\u043e\u0448\u0435\u043d\u044b');
}

/* ----------------------------- events ----------------------------- */

function bindEvents() {
  $$('[data-tab]').forEach(function (button) {
    button.addEventListener('click', function () { setTab(button.dataset.tab, true); });
  });
  $$('[data-go]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      setTab(link.dataset.go, true);
    });
  });

  window.addEventListener('popstate', function () { setTab(initialTab(), false); });
  window.addEventListener('hashchange', function () {
    if (navTab !== initialTab()) setTab(initialTab(), false);
  });

  $('#cycleTheme').addEventListener('click', cycleTheme);
  $('#pickBg').addEventListener('click', function () { bgFile.click(); });
  $('#choosePhoto').addEventListener('click', function () { bgFile.click(); });
  removePhotoBtn.addEventListener('click', removeBackground);
  bgFile.addEventListener('change', function () {
    if (bgFile.files && bgFile.files[0]) importPhoto(bgFile.files[0]);
    bgFile.value = '';
  });

  ['dragenter', 'dragover'].forEach(function (name) {
    photoPreview.addEventListener(name, function (event) {
      event.preventDefault();
      photoPreview.classList.add('is-dragover');
    });
  });
  ['dragleave', 'drop'].forEach(function (name) {
    photoPreview.addEventListener(name, function (event) {
      event.preventDefault();
      photoPreview.classList.remove('is-dragover');
    });
  });
  photoPreview.addEventListener('drop', function (event) {
    const file = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files[0] : null;
    if (file) importPhoto(file);
  });

  $('#blurRange').addEventListener('input', function (event) {
    state.settings.blur = Number(event.target.value);
    applySettings();
    saveSoon();
  });
  $('#dimRange').addEventListener('input', function (event) {
    state.settings.dim = Number(event.target.value);
    applySettings();
    saveSoon();
  });
  $('#opacityRange').addEventListener('input', function (event) {
    state.settings.panel = Number(event.target.value);
    applySettings();
    saveSoon();
  });
  $$('#fillPicker button').forEach(function (button) {
    button.addEventListener('click', function () {
      state.settings.fill = button.dataset.fill === 'contain' ? 'contain' : 'cover';
      applySettings();
      saveState();
    });
  });
  $('#soundToggle').addEventListener('click', function () {
    state.settings.sound = !state.settings.sound;
    applySettings();
    saveState();
    if (state.settings.sound) tone(660, 0.06, 'sine', 0.03);
  });
  $('#resetSettings').addEventListener('click', function () {
    if (typeof resetDialog.showModal === 'function') {
      try { resetDialog.showModal(); } catch { /* уже открыт */ }
    }
  });
  resetDialog.addEventListener('close', function () {
    if (resetDialog.returnValue === 'reset') resetEverything();
  });

  angleToggle.addEventListener('click', function () {
    state.angleMode = state.angleMode === 'deg' ? 'rad' : 'deg';
    angleToggle.textContent = state.angleMode === 'deg' ? 'DEG' : 'RAD';
    if (!state.showingResult) updateDisplay();
    saveState();
  });
  fractionToggle.addEventListener('click', function () {
    state.fractionMode = !state.fractionMode;
    fractionToggle.classList.toggle('is-on', state.fractionMode);
    fractionToggle.setAttribute('aria-pressed', state.fractionMode ? 'true' : 'false');
    updateDisplay();
    saveState();
  });

  $$('.sci-key').forEach(function (button) {
    button.addEventListener('click', function () {
      if (button.dataset.power) wrapPower(button.dataset.power);
      else if (button.dataset.action === 'inverse') invertValue();
      else if (button.dataset.insert) insertToken(button.dataset.insert);
    });
  });

  $$('.key').forEach(function (button) {
    button.addEventListener('click', function () {
      const action = button.dataset.action;
      if (action === 'clear') clearCalculator();
      else if (action === 'backspace') backspace();
      else if (action === 'sign') toggleSign();
      else if (action === 'equals') commitCalculation();
      else if (button.dataset.insert) insertToken(button.dataset.insert);
    });
  });

  $('#copyResult').addEventListener('click', copyResult);
  clearHistoryBtn.addEventListener('click', clearHistory);

  historyToggleBtn.addEventListener('click', toggleHistory);
  historyCloseBtn.addEventListener('click', closeHistory);
  historyScrim.addEventListener('click', closeHistory);

  $$('#fillPicker button').forEach(function (button) {
    button.setAttribute('aria-pressed', button.classList.contains('is-active') ? 'true' : 'false');
  });

  hideAnswersBtn.addEventListener('click', toggleAnswers);
  $('#tableReset').addEventListener('click', resetTable);
  tableSizeSelect.addEventListener('change', function (event) {
    const value = Number(event.target.value);
    state.tableSize = [6, 8, 10, 12].indexOf(value) >= 0 ? value : 12;
    state.tableFocus = 0;
    state.revealed = {};
    renderTable();
  });
  tableEl.addEventListener('mouseover', handleTableHover);
  tableEl.addEventListener('mouseleave', clearTableHover);
  tableEl.addEventListener('click', handleTableClick);

  $$('[data-start]').forEach(function (button) {
    button.addEventListener('click', function () { startGame(button.dataset.start); });
  });
  gameOptions.addEventListener('click', function (event) {
    const button = event.target.closest('.game-option');
    if (button) chooseAnswer(Number(button.dataset.index));
  });
  $('#quitGame').addEventListener('click', quitGame);
  $('#playAgain').addEventListener('click', function () {
    if (game) startGame(game.mode);
  });
  $('#backToLobby').addEventListener('click', backToLobby);
  $('#resultToTable').addEventListener('click', resultToTable);

  window.addEventListener('keydown', handleKeydown);
}

function handleKeydown(event) {
  const meta = event.metaKey || event.ctrlKey || event.altKey;

  if (meta && event.shiftKey && event.code === 'KeyT') {
    event.preventDefault();
    cycleTheme();
    return;
  }
  if (meta && event.shiftKey && event.code === 'KeyB') {
    event.preventDefault();
    bgFile.click();
    return;
  }
  if (meta) return;

  if (navTab === 'games' && game && game.phase === 'playing' && !game.locked) {
    if (['1', '2', '3', '4'].indexOf(event.key) >= 0) {
      event.preventDefault();
      chooseAnswer(Number(event.key) - 1);
      return;
    }
  }

  if (event.key === 'Escape') {
    if (resetDialog.open) return;
    if (historyPanel.classList.contains('is-open')) {
      closeHistory();
      event.preventDefault();
      return;
    }
    if (navTab === 'calculator') {
      clearCalculator();
      event.preventDefault();
    }
    return;
  }

  if (navTab !== 'calculator') return;
  const target = event.target;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) return;

  if (event.key === 'Enter' || event.key === '=') {
    event.preventDefault();
    commitCalculation();
  } else if (event.key === 'Backspace') {
    event.preventDefault();
    backspace();
  } else if (/^[0-9]$/.test(event.key)) {
    event.preventDefault();
    insertToken(event.key);
  } else if (event.key === ',' || event.key === '.') {
    event.preventDefault();
    insertToken('.');
  } else if ('+-*/^!%()'.indexOf(event.key) >= 0) {
    event.preventDefault();
    insertToken(event.key);
  }
}

/* ----------------------------- init ----------------------------- */

function init() {
  loadState();
  const theme = THEMES.find(function (item) { return item.id === state.themeID; }) || THEMES[0];
  applyTheme(theme);
  applySettings();
  let background = null;
  try { background = localStorage.getItem(BG_KEY); } catch { background = null; }
  applyBackground(background);
  renderThemeGrid();
  renderHistory();
  renderTable();
  renderLobbyRecords();
  angleToggle.textContent = state.angleMode === 'deg' ? 'DEG' : 'RAD';
  fractionToggle.classList.toggle('is-on', state.fractionMode);
  fractionToggle.setAttribute('aria-pressed', state.fractionMode ? 'true' : 'false');
  tableSizeSelect.value = String(state.tableSize);
  updateDisplay();
  bindEvents();
  setTab(initialTab(), false);

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('sw.js').catch(function () { /* офлайн-режим не критичен */ });
  }
}

init();
