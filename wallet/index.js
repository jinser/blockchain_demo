const {STARTING_BALANCE} = require('../config');
const {ec} = require('../util/index');
const cryptoHash = require('../util/crypto-hash');

class Wallet {
    constructor() {
        this.balance = STARTING_BALANCE;
        
        this.keyPair = ec.genKeyPair();
        this.publicKey=this.keyPair.getPublic().encode('hex');
    }
    //sign hashed data
    sign(data) {
        return this.keyPair.sign(cryptoHash(data));
    }
}

module.exports = Wallet;