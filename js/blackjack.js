// blackjack.js — режим Блэкджек

(function () {
    if (!document.getElementById('bj-screen')) return;

    const START_BALANCE = 1000;
    const DECKS = 6;
    const CHIPS = [5, 25, 100, 500];
    const SUITS = ['♠', '♥', '♦', '♣'];
    const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    const TXT = {
        de: {
            balance: 'Guthaben', dealer: 'Dealer', you: 'Du', deal: 'Austeilen', hit: 'Karte',
            stand: 'Halten', double: 'Verdoppeln', clear: 'Löschen', next: 'Nächste Runde',
            restart: 'Neu starten', menu: '← Hauptmenü', placeBet: 'Setze deinen Einsatz',
            yourTurn: 'Du bist dran', dealerTurn: 'Dealer zieht …', blackjack: 'Blackjack! +${0}',
            win: 'Gewonnen +${0}', dealerBust: 'Dealer überkauft! +${0}', push: 'Unentschieden',
            lose: 'Verloren −${0}', bust: 'Überkauft −${0}'
        },
        ru: {
            balance: 'Баланс', dealer: 'Дилер', you: 'Вы', deal: 'Раздать', hit: 'Ещё',
            stand: 'Хватит', double: 'Удвоить', clear: 'Сбросить', next: 'Следующий раунд',
            restart: 'Начать заново', menu: '← Главное меню', placeBet: 'Сделайте ставку',
            yourTurn: 'Ваш ход', dealerTurn: 'Дилер берёт карты …', blackjack: 'Блэкджек! +${0}',
            win: 'Победа +${0}', dealerBust: 'Перебор у дилера! +${0}', push: 'Ничья',
            lose: 'Проигрыш −${0}', bust: 'Перебор −${0}'
        },
        en: {
            balance: 'Balance', dealer: 'Dealer', you: 'You', deal: 'Deal', hit: 'Hit',
            stand: 'Stand', double: 'Double', clear: 'Clear', next: 'Next round',
            restart: 'Restart', menu: '← Main menu', placeBet: 'Place your bet',
            yourTurn: 'Your turn', dealerTurn: 'Dealer draws …', blackjack: 'Blackjack! +${0}',
            win: 'You win +${0}', dealerBust: 'Dealer busts! +${0}', push: 'Push',
            lose: 'You lose −${0}', bust: 'Bust −${0}'
        }
    };

    let shoe = [], dealer = [], player = [];
    let balance = START_BALANCE, bet = 0, lastBet = 0;
    let phase = 'bet';
    let holeHidden = true;
    let message = null;
    let timers = [];

    const $b = id => document.getElementById(id);

    function lang() {
        return typeof currentLang !== 'undefined' && TXT[currentLang] ? currentLang : 'de';
    }

    function tx(key, amount) {
        const s = TXT[lang()][key];
        return amount === undefined ? s : s.replace('{0}', amount);
    }

    function later(fn, ms) {
        timers.push(setTimeout(fn, ms));
    }

    function clearTimers() {
        timers.forEach(clearTimeout);
        timers = [];
    }

    // ---------- Колода ----------
    function buildShoe() {
        shoe = [];
        for (let d = 0; d < DECKS; d++) {
            SUITS.forEach(s => RANKS.forEach(r => shoe.push({ r: r, s: s })));
        }
        for (let i = shoe.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
        }
    }

    function draw() {
        if (!shoe.length) buildShoe();
        const c = shoe.pop();
        c.fresh = true;
        return c;
    }

    function score(hand) {
        let total = 0, aces = 0;
        hand.forEach(function (c) {
            if (c.r === 'A') { aces++; total += 11; }
            else if ('JQK'.includes(c.r)) total += 10;
            else total += +c.r;
        });
        while (total > 21 && aces) { total -= 10; aces--; }
        return { total: total, soft: aces > 0 };
    }

    function isBlackjack(hand) {
        return hand.length === 2 && score(hand).total === 21;
    }

    // ---------- Ставки ----------
    function addBet(v) {
        if (phase !== 'bet' || balance - bet < v) return;
        bet += v;
        render();
    }

    function clearBet() {
        if (phase !== 'bet') return;
        bet = 0;
        render();
    }

    // ---------- Раунд ----------
    function deal() {
        if (phase !== 'bet' || bet <= 0) return;
        if (shoe.length < 52) buildShoe();
        balance -= bet;
        lastBet = bet;
        player = [];
        dealer = [];
        holeHidden = true;
        message = null;
        phase = 'dealing';
        render();

        [player, dealer, player, dealer].forEach(function (hand, i) {
            later(function () {
                hand.push(draw());
                render();
                if (i === 3) afterDeal();
            }, 300 + i * 380);
        });
    }

    function afterDeal() {
        const pn = isBlackjack(player), dn = isBlackjack(dealer);
        if (pn || dn) {
            holeHidden = false;
            finish(pn && dn ? 'push' : pn ? 'blackjack' : 'lose');
            return;
        }
        phase = 'play';
        render();
    }

    function hit() {
        if (phase !== 'play') return;
        player.push(draw());
        const s = score(player).total;
        if (s > 21) { holeHidden = false; finish('bust'); }
        else if (s === 21) stand();
        else render();
    }

    function stand() {
        if (phase !== 'play') return;
        phase = 'dealer';
        holeHidden = false;
        message = null;
        render();
        later(dealerStep, 700);
    }

    function doubleDown() {
        if (phase !== 'play' || player.length !== 2 || balance < bet) return;
        balance -= bet;
        bet *= 2;
        player.push(draw());
        if (score(player).total > 21) { holeHidden = false; finish('bust'); }
        else stand();
    }

    function dealerStep() {
        if (phase !== 'dealer') return;
        const s = score(dealer).total;
        if (s < 17) {
            dealer.push(draw());
            render();
            later(dealerStep, 800);
            return;
        }
        const p = score(player).total;
        finish(s > 21 ? 'dealerBust' : p > s ? 'win' : p < s ? 'lose' : 'push');
    }

    function finish(result) {
        let amount = 0;
        if (result === 'blackjack') {
            amount = Math.floor(bet * 1.5);
            balance += bet + amount;
        } else if (result === 'win' || result === 'dealerBust') {
            amount = bet;
            balance += bet * 2;
        } else if (result === 'push') {
            balance += bet;
        } else {
            amount = bet;
        }
        const cls = result === 'push' ? 'push' : (result === 'lose' || result === 'bust') ? 'lose' : 'win';
        message = { key: result, amount: amount, cls: cls };
        phase = 'done';
        render();
    }

    function nextRound() {
        if (phase !== 'done') return;
        if (balance <= 0) {
            balance = START_BALANCE;
            lastBet = 0;
        }
        player = [];
        dealer = [];
        message = null;
        holeHidden = true;
        bet = Math.min(lastBet, balance);
        phase = 'bet';
        render();
    }

    // ---------- Отрисовка ----------
    function cardHtml(c, hidden) {
        const fresh = c.fresh ? ' deal' : '';
        if (hidden) return `<div class="card back${fresh}"></div>`;
        const red = (c.s === '♥' || c.s === '♦') ? ' red' : '';
        return `<div class="card${red}${fresh}"><span>${c.r}</span><span>${c.s}</span></div>`;
    }

    function totalText(hand, onlyFirst) {
        if (!hand.length) return '';
        const s = score(onlyFirst ? hand.slice(0, 1) : hand);
        return s.soft && s.total < 21 ? (s.total - 10) + ' / ' + s.total : String(s.total);
    }

    function chips(v, scale) {
        return typeof chipsSvg === 'function' ? chipsSvg(v, scale) : '';
    }

    function render() {
        $b('bj-balance').innerHTML = `<small>${tx('balance')}</small>$${balance}`;
        $b('bj-dealer-label').textContent = tx('dealer');
        $b('bj-player-label').textContent = tx('you');

        $b('bj-dealer').innerHTML = dealer.map((c, i) => cardHtml(c, holeHidden && i === 1)).join('');
        $b('bj-player').innerHTML = player.map(c => cardHtml(c, false)).join('');
        $b('bj-dealer-total').textContent = totalText(dealer, holeHidden);
        $b('bj-player-total').textContent = totalText(player, false);

        const m = $b('bj-msg');
        m.className = message ? message.cls : '';
        m.textContent = message ? tx(message.key, message.amount)
            : phase === 'bet' ? tx('placeBet')
                : phase === 'play' ? tx('yourTurn')
                    : phase === 'dealer' ? tx('dealerTurn') : '';

        $b('bj-bet').innerHTML = bet > 0 ? chips(bet, 1.8) + `<span>$${bet}</span>` : '';

        const inBet = phase === 'bet';
        const inDone = phase === 'done';
        $b('bj-bet-ui').classList.toggle('hidden', !inBet);
        $b('bj-play-ui').classList.toggle('hidden', inBet || inDone);
        $b('bj-next').classList.toggle('hidden', !inDone);

        $b('bj-chips').querySelectorAll('.bj-chip').forEach(function (b) {
            b.disabled = !inBet || balance - bet < +b.dataset.v;
        });
        $b('bj-clear').disabled = bet <= 0;
        $b('bj-deal').disabled = bet <= 0;
        $b('bj-hit').disabled = phase !== 'play';
        $b('bj-stand').disabled = phase !== 'play';
        $b('bj-double').disabled = phase !== 'play' || player.length !== 2 || balance < bet;

        $b('bj-clear').textContent = tx('clear');
        $b('bj-deal').textContent = tx('deal');
        $b('bj-hit').textContent = tx('hit');
        $b('bj-stand').textContent = tx('stand');
        $b('bj-double').textContent = tx('double');
        $b('bj-next').textContent = tx(balance <= 0 ? 'restart' : 'next');
        $b('bj-menu').textContent = tx('menu');

        dealer.concat(player).forEach(c => { c.fresh = false; });
    }

    // ---------- Вход и выход ----------
    function init() {
        const box = $b('bj-chips');
        box.innerHTML = CHIPS.map(v =>
            `<button class="bj-chip" type="button" data-v="${v}">${chips(v, 1.5)}<span>${v}</span></button>`
        ).join('');
        box.addEventListener('click', function (e) {
            const b = e.target.closest('.bj-chip');
            if (b) addBet(+b.dataset.v);
        });

        $b('bj-clear').onclick = clearBet;
        $b('bj-deal').onclick = deal;
        $b('bj-hit').onclick = hit;
        $b('bj-stand').onclick = stand;
        $b('bj-double').onclick = doubleDown;
        $b('bj-next').onclick = nextRound;
        $b('bj-menu').onclick = exit;
        $b('bj-lang').onchange = function (e) {
            if (typeof setLanguage === 'function') setLanguage(e.target.value);
            render();
        };
    }

    function exit() {
        const s = $b('bj-screen');
        clearTimers();
        s.classList.add('leaving');
        setTimeout(function () {
            s.classList.add('hidden');
            s.classList.remove('leaving');
            if (window.showModeScreen) window.showModeScreen();
        }, 300);
    }

    window.startBlackjack = function () {
        clearTimers();
        buildShoe();
        balance = START_BALANCE;
        bet = 0;
        lastBet = 0;
        dealer = [];
        player = [];
        message = null;
        holeHidden = true;
        phase = 'bet';
        $b('bj-lang').value = lang();
        $b('bj-screen').classList.remove('hidden');
        render();
    };

    window.stopBlackjack = clearTimers;

    init();
})();