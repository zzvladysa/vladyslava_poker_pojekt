// mode.js — стартовое окно выбора режима

(function () {
    const setup = document.getElementById('setup-screen');
    let mode = 'poker';

    let screen = document.getElementById('mode-screen');
    if (!screen) {
        screen = document.createElement('section');
        screen.id = 'mode-screen';
        screen.innerHTML = `
            <h1>♠ Casino</h1>
            <div class="modes">
                <button class="mode active" data-mode="poker">
                    <span class="mode-icon">♠</span>
                    <b>Poker</b>
                    <small>Texas Hold'em</small>
                </button>
                <button class="mode" data-mode="blackjack">
                    <span class="mode-icon red">♥</span>
                    <b>Blackjack</b>
                    <small>21</small>
                </button>
            </div>
            <button id="mode-start" class="gold-btn">Start</button>`;
        setup.parentNode.insertBefore(screen, setup);
    }

    screen.classList.remove('hidden');
    setup.classList.add('hidden');

    screen.querySelectorAll('.mode').forEach(function (btn) {
        btn.addEventListener('click', function () {
            screen.querySelectorAll('.mode').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            mode = btn.dataset.mode;
        });
    });

    document.getElementById('mode-start').addEventListener('click', function () {
        screen.classList.add('leaving');
        setTimeout(function () {
            screen.classList.add('hidden');
            screen.classList.remove('leaving');
            if (mode === 'blackjack') {
                if (window.startBlackjack) window.startBlackjack();
                return;
            }
            setup.classList.remove('hidden');
            setup.classList.add('glow-in');
            setup.addEventListener('animationend', function done(e) {
                if (e.animationName !== 'panel-glow') return;
                setup.classList.remove('glow-in');
                setup.removeEventListener('animationend', done);
            });
        }, 300);
    });

    const back = document.getElementById('back-btn');
    if (back) {
        back.addEventListener('click', function () {
            setup.classList.add('leaving');
            setTimeout(function () {
                setup.classList.add('hidden');
                setup.classList.remove('leaving');
                screen.classList.remove('hidden');
            }, 300);
        });
    }

    window.showModeScreen = function () {
        setup.classList.add('hidden');
        screen.classList.remove('hidden');
    };
})();