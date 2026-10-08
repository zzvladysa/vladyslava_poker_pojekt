// ===== player.js: класс игрока =====
class Player {
    constructor(id, stack) {
        this.id = id;
        this.stack = stack;
        this.reset();
    }

    get isBot() { return this.id !== 0; }
    get name() { return this.isBot ? t('bot') + ' ' + this.id : t('you'); }
    get canAct() { return !this.isFolded && !this.isAllIn; }

    // Сброс перед новой раздачей. Без фишек игрок вне раздачи.
    reset() {
        this.cards = [];
        this.currentBet = 0;     // ставка в текущем круге
        this.contrib = 0;        // всего внесено за раздачу
        this.isFolded = this.stack <= 0;
        this.isAllIn = false;
        this.say = '';           // реплика над игроком
        this.best = null;        // лучшая рука на вскрытии
        this.handText = '';
    }

    // Вносит фишки (не больше стека). Возвращает, сколько внёс.
    putChips(amount) {
        const paid = Math.min(amount, this.stack);
        this.stack -= paid;
        this.currentBet += paid;
        this.contrib += paid;
        if (this.stack === 0) this.isAllIn = true;
        return paid;
    }
}