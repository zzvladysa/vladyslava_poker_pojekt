//  deck.js: колода 
const SUITS = ['♠', '♥', '♦', '♣'];
const RANK_NAMES = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

class Deck {
    constructor() {                       // новая колода сразу перемешана
        this.cards = [];
        for (const suit of SUITS) {
            for (let rank = 2; rank <= 14; rank++) this.cards.push({ rank, suit });   // 14 = туз
        }
        this.shuffle();
    }

    shuffle() {                           // Фишер-Йетс
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw() { return this.cards.pop(); }
}

function rankToText(rank) {
    return RANK_NAMES[rank] || rank;
}

function cardToText(card) {
    return rankToText(card.rank) + card.suit;
}