const MINE_RATE = 1000; /*1 second*/
const INITIAL_DIFFICULTY=3;
const STARTING_BALANCE=1000;

const GENESIS_DATA = {
    timestamp: 1,
    lastHash:'-----',
    hash: 'hash-one',
    difficulty: INITIAL_DIFFICULTY,
    nonce: 0,
    data: []
}; /*hardcoded values here*/

module.exports = {GENESIS_DATA, MINE_RATE,STARTING_BALANCE};