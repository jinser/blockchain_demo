const Block = require('./block');
const {cryptoHash} = require('../util');

class Blockchain {
    constructor() {
        this.chain = [Block.genesis()];
    }
    addBlock({data}) {
        const newBlock = Block.mineBlock({
            lastBlock: this.chain[this.chain.length-1],
            data
        });
        this.chain.push(newBlock);
    }
    replaceChain(chain) {
        //if new chain length is less, do not replace chain
        if(chain.length <= this.chain.length) {
            console.error('incoming chain must be longer');
            return;
        }
        //check if new chain is valid
        if(!Blockchain.isValidChain(chain)) {
            console.error('incoming chain must be valid');
            return;
        }
        console.log('replacing chain with',chain);
        this.chain = chain;
    }
    
    static isValidChain(chain) {
        //check genesis block
        if(JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis())) {
            return false;
        }
        for(let i=1;i<chain.length;i++) {
            const {timestamp,lastHash,hash,data,nonce,difficulty} = chain[i];
            const lastDifficulty = chain[i-1].difficulty;
            //check that block has the right lastHash
            const actualLastHash = chain[i-1].hash;
            if(lastHash!==actualLastHash) {
                return false;
            }
            //check that block has the right hash
            const validatedHash = cryptoHash(timestamp,lastHash,data,nonce,difficulty);
            if(hash!== validatedHash) {
                return false;
            }
            //prevent difficulty jumps
            if(Math.abs(lastDifficulty - difficulty) > 1) {
                return false;
            }
        }
        return true;
    }
}

module.exports = Blockchain;