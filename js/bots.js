// bots.js — сила руки и решения ботов

//  Боты 
// Сила руки от 0 до 1
function handStrength(p) {
    if (board.length === 0) {                       // префлоп: смотрим на две карты
        const [a, b] = p.cards.map(c => c.rank).sort((x, y) => y - x);
        let s = (a + b) / 40;
        if (a === b) s += 0.3 + a / 50;             // карманная пара
        if (p.cards[0].suit === p.cards[1].suit) s += 0.05;
        if (a !== b && a - b <= 2) s += 0.04;
        return Math.min(s, 1);
    }
    const score = best7(p.cards.concat(board));
    const base = [0.12, 0.42, 0.62, 0.74, 0.8, 0.86, 0.93, 0.98, 1][score[0]];
    return Math.min(1, base + score[1] / 14 * 0.1);
}

// Решение бота: ['fold'] | ['call'] | ['raise', сумма]
function botDecide(bot) {
    const s = handStrength(bot), r = Math.random(); // рандом для вариативности
    const bb = settings.bigBlind;
    const total = pot + players.reduce((sum, p) => sum + p.currentBet, 0);
    const round = x => Math.max(bb, Math.round(x / bb) * bb);
    const toCall = currentStreetBet - bot.currentBet;

    if (toCall <= 0) {                              // можно чекнуть или ставить
        if ((s > 0.6 && r < 0.65) || r < 0.06) return ['raise', round(total * (0.4 + Math.random() * 0.4))];
        if (s > 0.4 && r < 0.2) return ['raise', round(total * 0.33)];
        return ['call'];
    }
    const odds = toCall / (total + toCall);         // сколько надо доплатить относительно банка
    if (s > 0.8 && r < 0.45) return ['raise', currentStreetBet + Math.max(lastRaise, round(total * 0.6))];
    if (r < 0.04) return ['raise', currentStreetBet + Math.max(lastRaise, bb * 2)];   // редкий блеф
    if (s + 0.15 > odds * 1.4) return ['call'];
    return ['fold'];
}

// Бот "думает" (реплика ...), потом ходит
function botTurn() {
    if (handOver) return;
    const bot = players[currentPlayerIndex];
    if (!bot.isBot) return;
    bot.say = '...';
    renderTable();
    const id = handCounter;
    setTimeout(function () {
        if (id === handCounter && !handOver && players[currentPlayerIndex] === bot) {
            doAction(bot, ...botDecide(bot));
        }
    }, 1400 + Math.random() * 1000);
}