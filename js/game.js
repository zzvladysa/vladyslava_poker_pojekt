// game.js — вся логика раздачи: торги, улицы, вскрытие, банки, меню
// ---------- Ход раздачи ----------
function startHand() {
    const alive = players.filter(p => p.stack > 0);
    if (alive.length < 2 || players[0].stack <= 0) return finishHand();

    handCounter++;
    deck = new Deck();
    board = [];
    pot = 0;
    currentStreet = 0;
    acted.clear();
    handOver = false;
    showAllCards = false;
    players.forEach(p => p.reset());
    players.filter(p => !p.isFolded).forEach(p => p.cards = [deck.draw(), deck.draw()]);

    dealerIndex = nextAliveIndex(dealerIndex);
    sbIndex = alive.length === 2 ? dealerIndex : nextAliveIndex(dealerIndex);
    bbIndex = nextAliveIndex(sbIndex);
    const sb = players[sbIndex].putChips(settings.bigBlind / 2);
    const bb = players[bbIndex].putChips(settings.bigBlind);
    currentStreetBet = settings.bigBlind;
    lastRaise = settings.bigBlind;

    addLog(t('logNewHand', players[dealerIndex].name));
    addLog(t('logSb', players[sbIndex].name, sb));
    addLog(t('logBb', players[bbIndex].name, bb));
    afterAction(bbIndex);                // выбирает, кто ходит первым
}

function doAction(player, type, raiseTo) {
    if (handOver || player.id !== currentPlayerIndex) return;
    const name = player.name;

    if (type === 'fold') {
        player.isFolded = true;
        addLog(t('logFold', name));
        player.say = tPick('sFold');
    } else if (type === 'call') {
        const paid = player.putChips(currentStreetBet - player.currentBet);
        addLog(paid > 0 ? t('logCall', name, paid) + (player.isAllIn ? t('logAllIn') : '') : t('logCheck', name));
        player.say = paid > 0 ? tPick(player.isAllIn ? 'sAllin' : 'sCall') : tPick('sCheck');
    } else {
        const to = Math.min(raiseTo, player.stack + player.currentBet);
        if (to <= currentStreetBet) return doAction(player, 'call');
        const wasBet = currentStreetBet === 0;
        const size = to - currentStreetBet;
        player.putChips(to - player.currentBet);
        if (size >= lastRaise) lastRaise = size;
        currentStreetBet = to;
        acted.clear();                   // повышение открывает торги заново
        addLog(t(wasBet ? 'logBet' : 'logRaise', name, to) + (player.isAllIn ? t('logAllIn') : ''));
        player.say = player.isAllIn ? tPick('sAllinAmt', to) : tPick(wasBet ? 'sBet' : 'sRaise', to);
    }
    acted.add(player.id);
    afterAction(player.id);
}

function afterAction(fromIndex) {
    const alive = players.filter(p => !p.isFolded);
    if (alive.length === 1) return awardPot(alive[0]);

    const able = players.filter(p => p.canAct);
    const roundDone = able.length === 0
        || (able.length === 1 && able[0].currentBet >= currentStreetBet)
        || able.every(p => acted.has(p.id) && p.currentBet === currentStreetBet);
    if (roundDone) {
        currentPlayerIndex = -1;
        renderTable();
        const id = handCounter;
        setTimeout(function () { if (id === handCounter && !handOver) nextStreet(); }, 1000);
        return;
    }

    currentPlayerIndex = nextActiveIndex(fromIndex);
    renderTable();
    botTurn();
}

function collectBets() {
    players.forEach(function (p) { pot += p.currentBet; p.currentBet = 0; });
}

function nextStreet() {
    collectBets();
    players.forEach(p => p.say = '');
    currentStreetBet = 0;
    lastRaise = settings.bigBlind;
    acted.clear();
    if (currentStreet === 3) return showdown();

    currentStreet++;
    const count = currentStreet === 1 ? 3 : 1;      // флоп: 3 карты, потом по одной
    for (let i = 0; i < count; i++) board.push(deck.draw());
    addLog(t('logBoard', t('street' + currentStreet), board.map(cardToText).join(' ')));

    if (players.filter(p => p.canAct).length < 2) {         // все в олл-ине: открываем борд сами
        currentPlayerIndex = -1;
        renderTable();
        const id = handCounter;
        setTimeout(function () { if (id === handCounter && !handOver) nextStreet(); }, 1300);
        return;
    }
    currentPlayerIndex = nextActiveIndex(dealerIndex);
    renderTable();
    botTurn();
}

function awardPot(winner) {
    collectBets();
    winner.stack += pot;
    addLog(t('logWin', winner.name, pot));
    finishHand();
}

function finishHand() {
    pot = 0;
    handOver = true;
    currentPlayerIndex = -1;
    checkGameOver();
    renderTable();
}

function showdown() {
    currentStreet = 4;
    showAllCards = true;
    currentPlayerIndex = -1;
    const order = [];
    for (let k = 1; k <= players.length; k++) {
        const p = players[(dealerIndex + k) % players.length];
        if (!p.isFolded) order.push(p);
    }
    order.forEach(p => p.best = best7(p.cards.concat(board)));
    order.forEach(function (p) {
        p.handText = describeHand(p.best);
        // Одинаковое название у двух игроков: добавляем карту, которая решает спор
        const twin = order.find(q => q !== p && describeHand(q.best) === p.handText);
        if (twin) {
            let i = 1;
            while (i < p.best.length && p.best[i] === twin.best[i]) i++;
            if (i < p.best.length) p.handText += ', ' + t('hKicker', rankWord('rankSing', p.best[i]));
        }
    });

    const id = handCounter;
    let i = 0;
    renderTable();
    (function announce() {
        if (id !== handCounter) return;
        if (i < order.length) {
            const p = order[i++];
            p.say = p.handText;
            addLog(p.name + ': ' + p.cards.map(cardToText).join(' ') + ' — ' + p.say);
            renderTable();
            setTimeout(announce, 1400);
        } else {
            distributePots();
        }
    })();
}

function distributePots() {
    const left = players.map(p => p.contrib);
    while (left.some(x => x > 0)) {
        const level = Math.min(...left.filter(x => x > 0));
        let amount = 0;
        const payers = [], eligible = [];
        left.forEach(function (x, i) {
            if (x > 0) {
                amount += level;
                left[i] -= level;
                payers.push(i);
                if (!players[i].isFolded) eligible.push(i);
            }
        });
        if (payers.length === 1) {            // непокрытая часть ставки возвращается владельцу
            players[payers[0]].stack += amount;
            continue;
        }
        if (eligible.length === 0) {          // вклад сфолдивших без претендентов: возврат
            payers.forEach(i => players[i].stack += level);
            continue;
        }
        let top = eligible[0];
        eligible.forEach(i => { if (cmpScore(players[i].best, players[top].best) > 0) top = i; });
        const winners = eligible.filter(i => cmpScore(players[i].best, players[top].best) === 0);
        const share = Math.floor(amount / winners.length);
        winners.forEach(function (i, k) {
            players[i].stack += share + (k === 0 ? amount - share * winners.length : 0);
            if (!players[i].say.startsWith('🏆')) players[i].say = '🏆 ' + players[i].say;
        });
        const names = winners.map(i => players[i].name).join(', ');
        addLog((winners.length > 1 ? t('logSplit', names, amount, share) : t('logWin', names, amount)) + ' (' + players[top].handText + ')');
    }
    finishHand();
}

// ---------- Конец игры и выход в меню ----------
function checkGameOver() {
    gameOver = players[0].stack <= 0 || players.filter(p => p.stack > 0).length < 2;
    if (gameOver) addLog(t(players[0].stack <= 0 ? 'logLose' : 'logWinAll'));
}

let confirmAction = null;
function showConfirm(text, onYes) {
    $('confirm-text').textContent = text;
    confirmAction = onYes;
    $('confirm-modal').classList.remove('hidden');
}
function closeConfirm() {
    $('confirm-modal').classList.add('hidden');
    confirmAction = null;
}

function backToMenu() {
    if (handOver) goToMenu();
    else showConfirm(t('confirmMenu'), goToMenu);
}

function goToMenu() {
    handCounter++;                       // старые таймеры ботов больше не сработают
    handOver = true;
    players = [];
    gameScreen.classList.add('hidden');
    setupScreen.classList.remove('hidden');
}