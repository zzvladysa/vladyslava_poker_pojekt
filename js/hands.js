// ===== hands.js: оценка комбинаций и их словесное описание =====

// 5 карт -> [категория, тай-брейки...]. Сравнивается по порядку.
// Категории: 0 старшая, 1 пара, 2 две пары, 3 сет, 4 стрит, 5 флеш, 6 фулл-хаус, 7 каре, 8 стрит-флеш
function eval5(cards) {
    const count = {};
    cards.forEach(c => count[c.rank] = (count[c.rank] || 0) + 1);
    // Номиналы: сначала те, что встречаются чаще, потом старшие
    const ranks = Object.keys(count).map(Number).sort((a, b) => count[b] - count[a] || b - a);
    const counts = ranks.map(r => count[r]);

    const flush = cards.every(c => c.suit === cards[0].suit);
    let straight = false, high = ranks[0];
    if (ranks.length === 5) {
        if (ranks[0] - ranks[4] === 4) straight = true;
        else if (ranks.join() === '14,5,4,3,2') { straight = true; high = 5; }   // колесо A-5
    }

    let cat = 0;
    if (straight && flush) cat = 8;
    else if (counts[0] === 4) cat = 7;
    else if (counts[0] === 3 && counts[1] === 2) cat = 6;
    else if (flush) cat = 5;
    else if (straight) cat = 4;
    else if (counts[0] === 3) cat = 3;
    else if (counts[0] === 2 && counts[1] === 2) cat = 2;
    else if (counts[0] === 2) cat = 1;

    return [cat, ...(straight ? [high] : ranks)];
}

// Лучшая рука из 7 карт: перебираем все варианты "выкинуть 2 карты"
function best7(cards) {
    let best = null;
    for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
            const score = eval5(cards.filter((_, k) => k !== i && k !== j));
            if (!best || cmpScore(score, best) > 0) best = score;
        }
    }
    return best;
}

// > 0 если a сильнее b, < 0 если слабее, 0 если ничья
function cmpScore(a, b) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const diff = (a[i] || 0) - (b[i] || 0);
        if (diff) return diff;
    }
    return 0;
}

// Название номинала в нужной форме: 'rankSing' | 'rankGen' | 'rankPlur'
function rankWord(form, rank) {
    return translations[currentLang][form][rank - 2];
}

// Комбинация словами: "Paar Könige", "Full House, Könige über Achter"...
function describeHand(score) {
    const [cat, a, b] = score;
    switch (cat) {
        case 8: return a === 14 ? t('hRoyal') : t('hStraightFlush', rankWord('rankGen', a));
        case 7: return t('hQuads', rankWord('rankPlur', a));
        case 6: return t('hFull', rankWord('rankPlur', a), rankWord('rankPlur', b));
        case 5: return t('hFlush', rankWord('rankGen', a));
        case 4: return t('hStraight', rankWord('rankGen', a));
        case 3: return t('hTrips', rankWord('rankPlur', a));
        case 2: return t('hTwoPair', rankWord('rankPlur', a), rankWord('rankPlur', b));
        case 1: return t('hPair', rankWord('rankPlur', a));
        default: return t('hHigh', rankWord('rankSing', a));
    }
}