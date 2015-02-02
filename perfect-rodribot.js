var BotHelper = require("./BotHelper");

var info = {
    name: "Rodribot",
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
    var lowCard = BotHelper.lowCardValue(game.self.cards);
    var hasPair = hand.bestHand.ranking == "pair";
    
    hasPair && console.log("Wow, got a pair in the pre-flop! Sweet!");
    
    var maximumWage = 0;
    if (hasPair && bestCard>11) {
        maximumWage = 600;
    } else if (hasPair) {
        maximumWage = 350;
    } else if (bestCard > 11) {
        maximumWage = 100;
    }
    
    if (hasPair && (game.self.wagered +game.betting.raise) < maximumWage && bestCard>=13) {
        return {action:"RAISE-PREFLOP", bet:maximumWage};
    } else if (hasPair && bestCard > 10 &&(game.self.wagered +game.betting.raise<maximumWage)) {
        return {action: "CALL-PREFLOP", bet: game.betting.raise};
    } else if (bestCard>12 && (game.self.wagered +game.betting.raise<maximumWage)) {
        return {action: "CALL-PREFLOP", bet: game.betting.call};
    } else if (game.self.wagered <= game.self.blind && game.self.wagered +game.betting.raise<maximumWage) {
        return {action: "CALL-PREFLOP BLIND", bet: game.betting.call};
    } else if (game.self.wagered +game.betting.raise<maximumWage && lowCard > 10) {
        return {action: "CALL-PREFLOP BLIND", bet: game.betting.call};
    } else {
        return {action:"FOLD-PREFLOP", bet: 0};
        
    }
}

/**
 * Evaluate a danger level, ie the level of potential thread from other players, based on
 * assumptions built from the community cards.
 * 0 = no danger
 * 5 = moderate danger
 * 10+ = serious thread
 * 20+ = lethal
 * *
 * @param hand
 * @param communityCardArray
 * @returns {number}
 */
function evaluateDangerZone(hand, selfHandRank, communityCardArray, selfCards) {

    var dangerLevel = 0;
    var bestCard = hand.getNumericBestCard(); // 2=1, ..., J=10, Q=11, K=12, A=13
    
    // If we have 5 cards, we use the hand evaluator on the community
    if (communityCardArray.length = 5) {
        var communityHand = new BotHelper.Hand(communityCardArray);
        if (communityHand.getNumericRanking() >= selfHandRank) {
            dangerLevel = 10;
        } else if (communityHand.getNumericRanking() + 1 >= selfHandRank) {
            dangerLevel = 5;
        } else if (communityHand.getNumericRanking() > 1) {
            dangerLevel = 1;
        }
    }
    
    // There may be pairs or three of a kind in the community
    var commGroup = BotHelper.hasGroup(communityCardArray);
    dangerLevel += (commGroup>=2) ? 2 + (commGroup * 2) : 0;

    // If our best card is a low one
    if (selfHandRank < 4 && bestCard < 11) {
        dangerLevel += 3 + (4-selfHandRank);
    } else if (selfHandRank >= 4 && selfHandRank <6  && bestCard < 11) {
        dangerLevel += 1;
    }

    if (BotHelper.lowCardValue(selfCards) > 10) {
        dangerLevel -= 1;
    }

    // If there is a possible straight, we're in danger zone
    var possibleStraight = BotHelper.possibleStraight(communityCardArray);
    if (possibleStraight >= 3) {
        dangerLevel += 5;
    } else if (possibleStraight >= 4) {
        dangerLevel += 20;
    }

    return dangerLevel;
}

function postFlopEvaluator(hand, communityCardArray, selfCards) {

    var handRank = hand.getNumericRanking();
    var maximumWage = 0;
    if (handRank < 3) {
        maximumWage = handRank * 100;
    } else if (handRank < 4) {
        maximumWage = handRank * 200;
    } else if (handRank <6) {
        maximumWage = handRank * 500;
    } else {
        maximumWage = handRank * 1000;
    }

    var result = { // default result
        rankAlwaysRaiseThresold: 4,
        rankAlwaysCallThreshold: 3,
        rankMayCallThreshold: 2,
        maximumWage: maximumWage
    };
    var dangerLevel = evaluateDangerZone(hand, handRank, communityCardArray, selfCards);

    // Adjust according to danger level
    if (dangerLevel>=10) {
        result.rankAlwaysRaiseThresold = 6;
        result.rankAlwaysCallThreshold = 5;
        result.rankMayCallThreshold = 4;
        result.maximumWage /= 4;
    } else if (dangerLevel >= 5) {
        result.rankAlwaysRaiseThresold = 5;
        result.rankAlwaysCallThreshold = 4;
        result.rankMayCallThreshold = 3;
        result.maximumWage /= 3;
    } else if (dangerLevel>0) {
        result.rankAlwaysRaiseThresold = 5;
        result.rankAlwaysCallThreshold = 4;
        result.rankMayCallThreshold = 2;
        result.maximumWage /= 2;
    }
    result.dangerLevel = dangerLevel;
    return result;
}

function calculateBet(game, hand) {
    var bestCard = hand.getNumericBestCard(); // 2=1, ..., J=10, Q=11, K=12, A=13

    // the handRank value is important: 1 = high card, 2 = pair, 3 = three of a kind, ... ,10 = royal flush
    var handRank = hand.getNumericRanking();

    handRank > 1 && console.log("Wow, I have something big:", hand.bestHand.ranking, "of rank", hand.bestHand.playingCards[0].rank);
    
    var evaluation = postFlopEvaluator(hand, game.community, game.self.cards);

    console.log("== ", hand.bestHand.ranking, "@", handRank + ":" + bestCard,"Danger", evaluation.dangerLevel, "max("+evaluation.maximumWage +")" ,handRank +"::"+evaluation.rankMayCallThreshold+"/"+evaluation.rankAlwaysCallThreshold+"/"+evaluation.rankAlwaysRaiseThresold, "rank", "["+game.self.cards.join(",")+"]", "["+game.community.join(",") + "]");

    if (handRank >= evaluation.rankAlwaysRaiseThresold) {
        
        var multiplier = (handRank - 2)<1?1:(handRank*5);
        var bet = parseInt("" + game.betting.raise * multiplier);
        bet = parseInt(""+evaluation.maximumWage);
        return {action:game.betting.canRaise ?"RAISE-1":"CALL-1 (LIMIT)", bet: game.betting.canRaise ? bet : game.betting.call};

    } else if (handRank >= evaluation.rankAlwaysCallThreshold) {
        var modifier1 = 5, modifier2 = 2;
        if (handRank>3 && Math.random()>0.9 && (game.betting.call*modifier1+game.self.wagered) < evaluation.maximumWage) {
            return {action: "RAISE-2", bet:game.betting.call*modifier1};
        } else if (handRank>3 && Math.random()>0.8 && (game.betting.call*modifier2+game.self.wagered) < evaluation.maximumWage) {
            return {action: "RAISE-2", bet:game.betting.call*modifier2};
        }
        
        return {action: "CALL-2", bet:game.betting.call};
        
    } else if (handRank >= evaluation.rankMayCallThreshold && (game.betting.call+game.self.wagered) < evaluation.maximumWage) {
        return {action: "CALL-3", bet:game.betting.call};
    } else if (game.betting.call == 0) {
        return {action: "CALL-4", bet:game.betting.call};
    } else {
        return {action: "CALL-FOLD", bet: 0};
    }

}

function update(game) {

    if (game.state !== "complete") {

        var hand = BotHelper.Hand(game);

        var result = {};
        switch (game.state) {
            
            case "pre-flop": // No card in the community, two in hands
                result = calculatePreflopBet(game, hand);
                break;
            
            case "flop": // three cards in the community
                result = calculateBet(game, hand);
                break;
            
            case "turn": // four cards in the community
                result = calculateBet(game, hand);
                break;
            
            case "river": // five cards in the community
            default:
                result = calculateBet(game, hand);
                break;
        }

        console.log(result.action, game.state, game.self.chips, "bestCard:", hand.getNumericBestCard(), "hand rank", hand.getNumericRanking(), hand.bestHand.ranking, "best hand", JSON.stringify(hand.bestHand.playingCards), "returned bet", result.bet, game.betting);
        return result.bet;
    } else {
        var winnerSelf = game.players[game.self.position].payout > 0; // game.winners.filter(function(w){w.position == game.self.position});
        var status =  winnerSelf ? "WINNER":"LOSER";
        var amount = game.players[game.self.position].payout;
        try {
            var hadWinningHand = BotHelper.findIfWinningHandInGameComplete(game);
        }catch (e){
            // don't bother
        }
        console.log("----------------------------- END OF GAME --", status, hadWinningHand?"[BEST]":"", amount, "@", game.state, game.self.chips, "[", game.community.join(","), "]");
    }
}

module.exports = { update: update, info: info };