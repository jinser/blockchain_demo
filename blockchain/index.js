const Block = require('./block');
const Transaction = require('../wallet/transaction');
const Wallet = require('../wallet');
const {cryptoHash} = require('../util');
const {REWARD_INPUT,MINING_REWARD} = require('../config');

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
    replaceChain(chain, validateTransactions, onSuccess) {
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
        
        //check for valid transaction data
        if(validateTransactions && !this.validTransactionData({chain })) {
            console.error('the incoming chain has invalid data');
            return;
        }
        
        if(onSuccess) {
            onSuccess();
        }
        console.log('replacing chain with',chain);
        this.chain = chain;
    }
    
    validTransactionData({chain}) {
      
        for(let i =1;i<chain.length;i++) {
            const block = chain[i];
            
            //ensure no duplicate transactions created
            const transactionSet = new Set();
            
            //ensure only 1 reward txn per block
            let rewardTransactionCount = 0;
            
            for(let transaction of block.data) {
                if(transaction.input.address === REWARD_INPUT.address) {
                    rewardTransactionCount+=1;
                    
                    if(rewardTransactionCount>1) {
                        console.error('Miner rewards exceed limit');
                        return false;
                    }
                    if(Object.values(transaction.outputMap)[0] !== MINING_REWARD) {
                        console.error('Miner reward amount is invalid');
                        return false;
                    }
                } else { //transaction is not a reward transaction
                    if(!Transaction.validTransaction(transaction)) {
                        console.error('invalid transaction');
                        return false;
                    }
                    //if input chain is faked
                    const trueBalance = Wallet.calculateBalance({
                        chain: this.chain,
                        address: transaction.input.address
                    });
                    if(transaction.input.amount!== trueBalance) {
                        console.error('Invalid input amount');
                        return false;
                    }
                    
                    //check for duplicate transactions
                    if(transactionSet.has(transaction)) {
                        console.error('identical transaction appears more than once in the block');
                        return false;
                    } else {
                        transactionSet.add(transaction);
                    }
                }
                
            }
        }
        return true;
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