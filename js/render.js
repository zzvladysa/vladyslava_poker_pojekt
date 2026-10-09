// render.js — вся отрисовка интерфейса (карты, игроки, кнопки, лог)

const TURN_TIME = 20;
const AVATAR_COLORS = ['#b8924a', '#5b87b0', '#b05b52', '#7a68a8', '#4a8a64', '#a07a58'];

const CHIP_DENOMS = [
    { v: 500, c: '#7a68b0', d: '#4f4280', e: '#ece6f7' },
    { v: 100, c: '#34383a', d: '#181b1c', e: '#d9b872' },
    { v: 25, c: '#3f9a6a', d: '#2a6a47', e: '#eef3ee' },
    { v: 5, c: '#cc5a50', d: '#923c35', e: '#f7ebe8' },
    { v: 1, c: '#eeebe1', d: '#b5b0a0', e: '#b85a52' }
];

let tmKey = '';
let tmStart = 0;
let tmTimer = null;

// ---------- Карты ----------
function cardToHtml(card, hidden) {
    if (hidden) return '<div class="card back"></div>';
    const color = (card.suit === '♥' || card.suit === '♦') ? 'red' : '';
    return `<div class="card ${color}"><span>${rankToText(card.rank)}</span><span>${card.suit}</span></div>`;
}

function renderBoard() {
    let html = '';
    for (let i = 0; i < 5; i++) {
        html += board[i] ? cardToHtml(board[i], false) : '<div class="card empty"></div>';
    }
    $('board').innerHTML = html;
}

// ---------- Фишки ----------
function chipsSvg(amount, scale) {
    scale = scale || 1;
    let rest = amount;
    const cols = [];
    for (const d of CHIP_DENOMS) {
        const n = Math.floor(rest / d.v);
        if (n > 0) {
            cols.push({ d: d, n: Math.min(n, 8) });
            rest -= n * d.v;
        }
        if (cols.length === 3) break;
    }
    if (!cols.length) return '';

    const rx = 11, ry = 5.2, h = 3.2, cw = 25;
    const maxN = Math.max.apply(null, cols.map(c => c.n));
    const W = cols.length * cw + 2;
    const H = Math.ceil(ry * 2 + maxN * h + 8);
    let g = '';

    cols.forEach(function (c, ci) {
        const cx = 1 + cw / 2 + ci * cw;
        const baseY = H - ry - h - 1 - (ci % 2 ? 0 : 2);
        for (let k = 0; k < c.n; k++) {
            const cy = baseY - k * h;
            g += `<ellipse cx="${cx}" cy="${cy + h}" rx="${rx}" ry="${ry}" fill="${c.d.d}"/>`
                + `<rect x="${cx - rx}" y="${cy}" width="${rx * 2}" height="${h}" fill="${c.d.d}"/>`
                + `<line x1="${cx - rx}" x2="${cx + rx}" y1="${cy + h / 2}" y2="${cy + h / 2}" stroke="${c.d.e}" stroke-width="${h * 0.7}" stroke-dasharray="2.4 2.4" opacity=".85"/>`
                + `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${c.d.c}" stroke="${c.d.d}" stroke-width=".6"/>`
                + `<ellipse cx="${cx}" cy="${cy}" rx="${rx - 1}" ry="${ry - 0.6}" fill="none" stroke="${c.d.e}" stroke-width="2" stroke-dasharray="3 3" pathLength="48"/>`
                + `<ellipse cx="${cx}" cy="${cy}" rx="${rx * 0.55}" ry="${ry * 0.55}" fill="none" stroke="${c.d.e}" stroke-opacity=".6" stroke-width=".8"/>`;
        }
    });

    return `<svg class="chips-svg" width="${W * scale}" height="${H * scale}" viewBox="0 0 ${W} ${H}">${g}</svg>`;
}

function renderPotChips() {
    let el = $('pot-chips');
    if (!el) {
        el = document.createElement('div');
        el.id = 'pot-chips';
        $('center').appendChild(el);
    }
    el.innerHTML = pot > 0 ? chipsSvg(pot, 1.35) : '';
}

// ---------- Таймер хода ----------
function syncTurnTimer() {
    const active = !handOver && !gameOver && players[currentPlayerIndex];
    let key = '';
    if (active) {
        const p = players[currentPlayerIndex];
        key = [handCounter, currentStreet, currentStreetBet, currentPlayerIndex, p.stack, p.currentBet].join('|');
    }
    if (key === tmKey) return;

    tmKey = key;
    tmStart = Date.now();
    clearTimeout(tmTimer);
    tmTimer = null;

    if (active && currentPlayerIndex === 0) {
        tmTimer = setTimeout(autoAct, TURN_TIME * 1000);
    }
}

function autoAct() {
    tmTimer = null;
    if (handOver || currentPlayerIndex !== 0) return;
    const need = currentStreetBet - players[0].currentBet;
    $(need > 0 ? 'fold-btn' : 'call-btn').click();
}

// ---------- Игроки ----------
function avatarText(name) {
    const num = (name.match(/\d+$/) || [''])[0];
    return name.trim().charAt(0).toUpperCase() + num;
}

function avatarHtml(player, i) {
    const elapsed = Math.min(TURN_TIME, (Date.now() - tmStart) / 1000);
    const ringCls = 'ring' + (player.isBot ? ' pulse' : '');
    const style = `--av:${AVATAR_COLORS[i % AVATAR_COLORS.length]};--dur:${TURN_TIME}s;--delay:-${elapsed.toFixed(2)}s`;
    return `<div class="avatar-wrap" style="${style}">
                <svg class="${ringCls}" viewBox="0 0 40 40">
                    <circle class="ring-bg" cx="20" cy="20" r="18"/>
                    <circle class="ring-fg" cx="20" cy="20" r="18"/>
                </svg>
                <div class="avatar">${avatarText(player.name)}</div>
            </div>`;
}

function renderPlayers() {
    const container = $('players-container');
    container.innerHTML = '';

    players.forEach(function (player, i) {
        const angle = (90 + i * 360 / players.length) * Math.PI / 180;
        const isTurn = i === currentPlayerIndex && !handOver;
        const winner = player.isWinner && !player.isFolded;

        const seat = document.createElement('div');
        seat.className = 'seat'
            + (isTurn ? ' turn' : '')
            + (player.isFolded ? ' folded' : '')
            + (winner ? ' winner' : '');
        seat.style.left = (50 + 50 * Math.cos(angle)) + '%';
        seat.style.top = (50 + 50 * Math.sin(angle)) + '%';

        const badges = [];
        if (i === dealerIndex) badges.push('D');
        if (i === sbIndex) badges.push('SB');
        if (i === bbIndex) badges.push('BB');
        if (player.isAllIn && !player.isFolded) badges.push('ALLIN');
        const badgesHtml = badges.map(b => `<span class="badge b-${b}">${b === 'ALLIN' ? 'All-in' : b}</span>`).join('');

        const hidden = player.isBot && !(showAllCards && !player.isFolded);
        const cardsHtml = player.cards.map(c => cardToHtml(c, hidden)).join('');

        const bubble = player.say ? `<div class="bubble${player.say === '...' ? ' think' : ''}">${player.say}</div>` : '';
        const handName = winner && player.handName ? `<div class="hand-name">★ ${player.handName}</div>` : '';

        seat.innerHTML = `
            ${bubble}
            <div class="seat-head">
                ${avatarHtml(player, i)}
                <span class="who"><b>${player.name}</b>${badgesHtml}</span>
            </div>
            <div class="cards">${cardsHtml}</div>
            <div>${t('stack')}: $${player.stack}</div>
            <div class="bet">${player.currentBet ? t('betLabel') + ': $' + player.currentBet : ''}</div>
            ${handName}`;
        container.appendChild(seat);

        if (player.currentBet > 0) {
            const bet = document.createElement('div');
            bet.className = 'bet-chips';
            const k = i === 0 ? 0.4 : 0.62;
            bet.style.left = (50 + 50 * Math.cos(angle) * k) + '%';
            bet.style.top = (50 + 50 * Math.sin(angle) * k) + '%';
            bet.innerHTML = chipsSvg(player.currentBet) + `<span>$${player.currentBet}</span>`;
            container.appendChild(bet);
        }
    });
}

// ---------- Кнопки ----------
function updateControls() {
    const me = players[0];
    const myTurn = !handOver && currentPlayerIndex === 0;
    const toCall = currentStreetBet - me.currentBet;
    const maxTo = me.stack + me.currentBet;
    const minTo = currentStreetBet === 0
        ? Math.min(settings.bigBlind, me.stack)
        : Math.min(maxTo, currentStreetBet + lastRaise);
    const canRaise = myTurn && maxTo > currentStreetBet && minTo < maxTo;

    $('call-btn').textContent = toCall > 0 ? t('call', Math.min(toCall, me.stack)) : t('check');
    $('raise-btn').textContent = currentStreetBet === 0 ? t('bet') : t('raiseTo');

    const slider = $('bet-slider'), input = $('bet-input');
    slider.min = input.min = minTo;
    slider.max = input.max = maxTo;
    const key = [handCounter, currentStreet, currentStreetBet, currentPlayerIndex].join('|');
    if (key !== sliderKey) {
        sliderKey = key;
        slider.value = input.value = minTo;
    }

    $('fold-btn').disabled = !myTurn;
    $('call-btn').disabled = !myTurn;
    $('raise-btn').disabled = !canRaise;
    slider.disabled = input.disabled = !canRaise;
    $('allin-btn').disabled = !myTurn || me.stack === 0;
    $('next-btn').classList.toggle('hidden', !handOver);
    $('next-btn').textContent = t(gameOver ? 'toMenu' : 'continueBtn');
}

function renderTable() {
    syncTurnTimer();
    $('street').textContent = t('street' + currentStreet);
    $('pot').textContent = t('pot') + ': $' + pot;
    renderBoard();
    renderPotChips();
    renderPlayers();
    updateControls();
}

function addLog(text) {
    const log = $('log');
    log.innerHTML += `<div>${text}</div>`;
    log.scrollTop = log.scrollHeight;
}