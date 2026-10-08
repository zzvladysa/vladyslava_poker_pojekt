// state.js — состояние игры, игроки, служебные ссылки

const $ = id => document.getElementById(id);   // короткая запись getElementById

const setupScreen = $('setup-screen');
const gameScreen = $('game-screen');
const startBtn = $('start-btn');

// ---------- Состояние ----------
const settings = { playersCount: 4, stack: 1000, bigBlind: 20 };
let players = [];
let deck = null;
let board = [];
let pot = 0;
let currentStreet = 0;          // 0 Preflop ... 4 Showdown
let dealerIndex = -1, sbIndex = -1, bbIndex = -1;
let currentPlayerIndex = -1;    // чей ход
let currentStreetBet = 0;       // максимальная ставка на улице
let lastRaise = 0;              // размер последнего повышения
let acted = new Set();          // кто уже ходил на этой улице
let handOver = true;
let gameOver = false;           // игра закончена: у тебя 0 или все боты выбыли
let showAllCards = false;
let handCounter = 0;            // номер раздачи (отсекает старые таймеры ботов)
let sliderKey = '';

// ---------- Игроки ----------
function readSettings() {
    settings.playersCount = Number($('set-players').value);
    settings.stack = Number($('set-stack').value);
    settings.bigBlind = Number($('set-bb').value);
}

function createPlayers() {
    players = Array.from({ length: settings.playersCount }, (_, i) => new Player(i, settings.stack));
}

function nextActiveIndex(from) {
    for (let k = 1; k <= players.length; k++) {
        const i = (from + k) % players.length;
        if (players[i].canAct) return i;
    }
    return -1;
}

function nextAliveIndex(from) {          // следующий игрок, у которого есть фишки
    for (let k = 1; k <= players.length; k++) {
        const i = (from + k) % players.length;
        if (players[i].stack > 0) return i;
    }
    return -1;
}
