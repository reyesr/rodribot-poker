var Ranker = require('handranker');

var TYPE_ROYAL_FLUSH     =   'royal flush';
var TYPE_STRAIGHT_FLUSH  =   'straight flush';
var TYPE_FOUR_OF_A_KIND  =   'four of a kind';
var TYPE_FULL_HOUSE      =   'full house';
var TYPE_FLUSH           =   'flush';
var TYPE_STRAIGHT        =   'straight';
var TYPE_THREE_OF_A_KIND =   'three of a kind';
var TYPE_TWO_PAIR        =   'two pair';
var TYPE_PAIR            =   'pair';
var TYPE_HIGH_CARD       =   'high card';

var hand_levels = ["---skip---", TYPE_HIGH_CARD, TYPE_PAIR, TYPE_TWO_PAIR, TYPE_THREE_OF_A_KIND, TYPE_STRAIGHT, TYPE_FLUSH, TYPE_FULL_HOUSE, TYPE_FOUR_OF_A_KIND, TYPE_STRAIGHT_FLUSH, TYPE_ROYAL_FLUSH];

function getHand(gameObject) {
    console.log("hand: ", best_hand);
    return best_hand;
}

function toCard(desc) {
    return {rank:desc.substr(0,1), suit:desc.substr(1)};
}

function cardToStr(obj) {
    return obj.rank + obj.suit;
}

function Hand(game) {
    
    if (!(this instanceof Hand)) {
        return new Hand(game);
    }
    
    this.name = undefined;
    this.bestHand = undefined;

    var all_cards = undefined;
    if (Array.isArray(game)) {
        all_cards = game;
    } else {
        all_cards = (game.community || []).concat(game.self.cards);
    }
    
    try {
        
        this.bestHand = Ranker.getHand(all_cards);
        
    } catch (e) {
        
        this.bestHand = {
            playingCards: all_cards && all_cards.length>0?all_cards.map(toCard):[{rank:0}],
            ranking: "none"
        };
        
        if (this.bestHand.playingCards.length == 2 && this.bestHand.playingCards[0].rank !== undefined 
            && this.bestHand.playingCards[0].rank === this.bestHand.playingCards[1].rank) {
            this.bestHand.ranking = "pair";
        }
    }
}

/**
 * Returns an integer referring to the ranking. The higher, the better.
 * @param hand
 * @returns {number} a number from 1 to 10
 */
Hand.prototype.getNumericRanking = function() {
    var rank = hand_levels.indexOf(this.bestHand.ranking);
    return rank<0?undefined:rank;
}

function convertCardToCardRank(cardStr) {
    var rank = cardStr.substr(0,1).toUpperCase();
    var candidate = parseInt(rank, 10);
    if (candidate>0) {
        return candidate;
    }
    switch (rank) {
        case 'T':
            return 10;
        case 'J':
            return 11;
        case 'Q':
            return 12;
        case 'K':
            return 13;
        case 'A':
            return 14;
    }
    return undefined;
}

/**
 * Returns an integer referring to the ranking of the best card in hand.
 * @param hand
 * @returns {number} a number from 1 to 13
 */
Hand.prototype.getNumericBestCard = function() {
    var rank = this.bestHand.playingCards[0].rank;
    return convertCardToCardRank(rank);
    
    var candidate = parseInt(rank, 10);
    if (candidate>0) {
        return candidate;
    }
    switch (rank) {
        case 'T':
            return 10;
        case 'J':
            return 11;
        case 'Q':
            return 12;
        case 'K':
            return 13;
        case 'A':
            return 14;
    }
    return undefined;
};

function findIfWinningHandInGameComplete(game) {
    //var hands = [{id:0, cards: game.self.cards}];
    var selfId = undefined;
    var hands = [];
    game.players.forEach(function(player, i) {
        var id = i;
        if (id === game.self.position) {
            selfId = id;
        }
        
        hands.push({id: id, cards: player.cards || [] });
    });

    var bestHand = Ranker.orderHands(hands, game.community);
    var firstPositionArray = [].concat(bestHand[0]);
    var selfOnly = firstPositionArray.filter(function(p) { return p.id === selfId;});
    // console.log("best hand:", bestHand);
    return selfOnly.length > 0;
}

function hasPair(arr) {
    var obj = {};
    for (var i=0; i<arr.length; i+=1) {
        if (obj[arr[i].substr(0,1)] !== undefined) {
            return true;
        }
        obj[arr[i].substr(0,1)] = true;
    }
    return false;
};

function hasGroup(arr) {
    var obj = {};
    for (var i=0; i<arr.length; i+=1) {
        if (typeof arr[i] == "string") {
            if (obj[arr[i].substr(0, 1)] !== undefined) {
                obj[arr[i].substr(0, 1)] += 1;
            } else {
                obj[arr[i].substr(0, 1)] = 1;
            }
        }
    }
    
    var result = 0;
    for(var k in obj) {
        if (obj.hasOwnProperty(k) && obj[k]>0){
            result = obj[k]>result ? obj[k] : result;
        }
    }
    
    return result;
};

function possibleStraight(cardArray) {
    var arr = [];
    for (var i=0; i<12; i+=1) {
        arr.push(0);
    }
    cardArray.forEach(function(el){
        var index = convertCardToCardRank(el);
        arr[index-2] += 1;
    });
    var maxStraight = 0;
    for (var i=0; i<= 7; i+=1) {
        var count = 0;
        for (var j=0; j<5; j+=1) {
            if (arr[i+j]>0) {
                count += 1;
            }
        }
        maxStraight = count > maxStraight ? count : maxStraight;
    }
    return maxStraight;
}

exports.Hand = Hand;
exports.cardToStr = cardToStr;
exports.findIfWinningHandInGameComplete = findIfWinningHandInGameComplete;

exports.hasGroup = hasGroup;
exports.possibleStraight = possibleStraight;

exports.lowCardValue = function(cardArray) {
    var loVal = 15;
    cardArray.forEach(function(c){
        var val = convertCardToCardRank(c);
        loVal = val < loVal ? val : loVal;
    });
    return loVal;
}