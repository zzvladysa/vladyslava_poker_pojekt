// script.js — запуск игры и обработчики событий
console.log('script.js geladen');
//  Запуск и события 
function startGame() {
    gameOver = false;
    readSettings();
    createPlayers();
    dealerIndex = -1;
    $('log').innerHTML = '';
    setupScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    startHand();
}

startBtn.addEventListener('click', startGame);
$('next-btn').addEventListener('click', function () { if (gameOver) backToMenu(); else startHand(); });
$('menu-btn').addEventListener('click', backToMenu);

// Окно с таблицей комбинаций
$('rank-btn').addEventListener('click', () => $('rank-modal').classList.remove('hidden'));
$('rank-close').addEventListener('click', () => $('rank-modal').classList.add('hidden'));
$('rank-modal').addEventListener('click', e => { if (e.target.id === 'rank-modal') $('rank-modal').classList.add('hidden'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { $('rank-modal').classList.add('hidden'); closeConfirm(); } });
$('confirm-yes').addEventListener('click', function () { const action = confirmAction; closeConfirm(); if (action) action(); });
$('confirm-no').addEventListener('click', closeConfirm);
$('fold-btn').addEventListener('click', () => doAction(players[0], 'fold'));
$('call-btn').addEventListener('click', () => doAction(players[0], 'call'));
$('allin-btn').addEventListener('click', () => doAction(players[0], 'raise', players[0].stack + players[0].currentBet));
$('raise-btn').addEventListener('click', function () {
    const input = $('bet-input');
    const value = Math.min(Number(input.max), Math.max(Number(input.min), Number(input.value) || Number(input.min)));
    doAction(players[0], 'raise', value);
});
$('bet-slider').addEventListener('input', e => $('bet-input').value = e.target.value);
$('bet-input').addEventListener('input', e => $('bet-slider').value = e.target.value);

function changeLanguage(lang) {
    setLanguage(lang);
    $('set-lang').value = lang;      // оба списка языка показывают одно и то же
    $('game-lang').value = lang;
    if (players.length > 0) renderTable();
}
$('set-lang').addEventListener('change', e => changeLanguage(e.target.value));
$('game-lang').addEventListener('change', e => changeLanguage(e.target.value));

applyLanguage();