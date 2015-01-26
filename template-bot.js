var BotHelper = require("./BotHelper");

var info = {
    name: "Nameless Pokerbot",
    email: ""
};

/*
 * The game object has the notable properties:
 *
 *  - game.community = [array of cards], ie [ '8d', '5s', '7h', 'Ts', 'Qd' ] or []
 *  - game.state  = 'pre-flop', 'flop', 'river', 'turn"
 *  - game.betting = { call: 20, raise: 40, canRaise: true } // 0 = fold
 *  - game.self = { name: 'Nameless Pokerbot',
 *                 blind: 5, // >0 if a blind was set
 *                 ante: 0,
 *                 wagered: 30, // Amount bet so far
 *                 state: 'active',
 *                 chips: 2664, // the remaining chips
 *                 actions: { previous actions },
 *                 cards: [ 'As', '4h' ],
 *                 position: 1 },
 */

/**
 * The pre-flop strategy is usually different from the others because there are only two cards in hand.
 * 
 * @param game
 * @param hand
 * @returns {*}
 */
function calculatePreflopBet(game, hand) {
    var bestCard = hand.getNumericBestCard(); // 2=1, ..., J=10, Q=11, K=12, A=13
    var hasPair = hand.bestHand.ranking == "pair";
    
    hasPair && console.log("Wow, got a pair in the pre-flop! Sweet!");
    
    if ((hasPair || bestCard>11) && game.self.wagered < 50) {
        return game.betting.raise;
    } else {
        return game.betting.call;
    }
}

function calculateBet(game, hand) {
    var bestCard = hand.getNumericBestCard(); // 2=1, ..., J=10, Q=11, K=12, A=13

    // the handRank value is important: 1 = high card, 2 = pair, 3 = three of a kind, ... ,10 = royal flush
    var handRank = hand.getNumericRanking();

    handRank > 1 && console.log("Wow, I have something big:", hand.bestHand.ranking, "of rank", hand.bestHand.playingCards[0].rank);
    
    return game.betting.call; // or game.betting.fold, or game.betting.raise
}

function update(game) {

    if (game.state !== "complete") {

        var hand = BotHelper.Hand(game);

        var bet = 0;
        switch (hand.state) {
            
            case "pre-flop": // No card in the community, two in hands
                bet = calculatePreflopBet(game, hand);
                break;
            
            case "flop": // three cards in the community
                bet = calculateBet(game, hand);
                break;
            
            case "turn": // four cards in the community
                bet = calculateBet(game, hand);
                break;
            
            case "river": // five cards in the community
            default:
                bet = calculateBet(game, hand);
                break;
        }

        console.log("bestCard:", hand.getNumericBestCard(), "hand rank", hand.getNumericRanking(), hand.bestHand.ranking, "best hand", JSON.stringify(hand.bestHand.playingCards), "returned bet", bet);
        return bet;
    }
}

module.exports = { update: update, info: info };