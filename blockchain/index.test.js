const Blockchain = require('./index');
const Block = require('./block');
const {cryptoHash} = require('../util');
const Wallet = require('../wallet');
const Transaction = require('../wallet/transaction');

describe('Blockchain', ()=> {
   let blockchain,newChain,originalChain,errorMock;
   
   /*give each following test its own blockchain so that changes made during a test are not propagated to other tests*/
   beforeEach(()=>{
       blockchain =new Blockchain();
       newChain = new Blockchain();
       originalChain = blockchain.chain;
       errorMock=jest.fn();
       global.console.error=errorMock;
   });
   
   it('contains a chain Array instance',()=> {
      expect(blockchain.chain instanceof Array).toBe(true); 
   });
   it('starts with Genesis block',()=>{
       expect(blockchain.chain[0]).toEqual(Block.genesis());
   });
   it('adds a new block to the chain', ()=> {
      const newData = 'new data';
      blockchain.addBlock({data: newData});
      expect(blockchain.chain[blockchain.chain.length-1].data).toEqual(newData);
   });
   
   describe('isValidChain()',()=>{
      describe('when chain does not start with genesis block',()=>{
         it('returns false',()=>{
             blockchain.chain[0] = {data: 'fake genesis block'};
             expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
         }) ;
      });
      describe('when chain starts with genesis block and has multiple blocks', ()=>{
          beforeEach(()=>{
            blockchain.addBlock({data: 'Test Data 1'}) ;
            blockchain.addBlock({data: 'Test Data 2'}) ;
            blockchain.addBlock({data: 'Test Data 3'}) ;
          });
          describe('and when a last hash reference has changed', ()=>{
             it('returns false',()=>{
        
               blockchain.chain[2].lastHash = 'broken-lasthash';
               expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
             }); 
          });
          describe('and the chain contains a block with an invalid field', ()=> {
             it('returns false',()=>{
               
               blockchain.chain[2].data = 'bad-data';
               expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
             }); 
          });
          describe('and the chain contains a block with a jumped difficulty',()=>{
              it('returns false', ()=> {
                  const lastBlock = blockchain.chain[blockchain.chain.length-1];
                  const lastHash=lastBlock.hash;
                  const timestamp = Date.now();
                  const nonce=0;
                  const data = [];
                  const difficulty = lastBlock.difficulty - 3;
                  const hash = cryptoHash(timestamp,lastHash,nonce,data,difficulty);
                  const badBlock = new Block({timestamp,lastHash,hash,nonce,difficulty,data});
                  
                  blockchain.chain.push(badBlock);
                  
                  expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
              });
          });
          describe('and the chain does not contain any invalid blocks', ()=>{
             it('returns true',()=>{
               
               expect(Blockchain.isValidChain(blockchain.chain)).toBe(true);
             }); 
          });
      });
   });
   describe('replaceChain()',()=>{
      let logMock;
      beforeEach(()=>{
          logMock=jest.fn();
          global.console.log=logMock;
      }); 
      describe('when the new chain is not longer',()=>{
          beforeEach(()=>{
            newChain.chain[0] = {new:'chain'};
            blockchain.replaceChain(newChain.chain);  
          });
          it('does not replace the chain',()=>{
            expect(blockchain.chain).toEqual(originalChain);
          });
          it('logs an error',()=>{
            expect(errorMock).toHaveBeenCalled(); 
          });
      }); 
      describe('when the new chain is longer',()=>{
         beforeEach(()=>{
            newChain.addBlock({data: 'Test Data 1'}) ;
            newChain.addBlock({data: 'Test Data 2'}) ;
            newChain.addBlock({data: 'Test Data 3'}) ;
          });
         describe('and the chain is invalid',()=>{
            beforeEach(()=>{
              newChain.chain[2].hash='fake-hash';
              blockchain.replaceChain(newChain.chain);  
            });
            it('does not replace the chain',()=>{
              expect(blockchain.chain).toEqual(originalChain);
            });
            it('logs an error',()=>{
              expect(errorMock).toHaveBeenCalled(); 
            });
         });
         describe('and the chain is valid',()=>{
            beforeEach(()=>{
              blockchain.replaceChain(newChain.chain);  
            });
            it('replace the chain',()=>{
              expect(blockchain.chain).toEqual(newChain.chain);
            }); 
            it('logs about chain replacement',()=>{
                expect(logMock).toHaveBeenCalled();
            });
         });
      });
      describe('and the validateTransactions flag is true', ()=>{
          it('calls the validateTransactionData()',()=>{
              const validTransactionDataMock = jest.fn();
              blockchain.validTransactionData = validTransactionDataMock;
              newChain.addBlock({data:'filler-data'});
              blockchain.replaceChain(newChain.chain,true);
              expect(validTransactionDataMock).toHaveBeenCalled();
          });
      });
   });
   describe('validTransactionData()',()=>{
       let transaction, rewardTransaction, wallet;
       beforeEach(()=>{
          wallet = new Wallet();
          transaction=wallet.createTransaction({recipient:'testrecipient',amount:65});
          rewardTransaction=Transaction.rewardTransaction({minerWallet:wallet});
       });
       describe('and the transaction data is valid',()=>{
           it('returns true',()=>{
               newChain.addBlock({data: [transaction,rewardTransaction]});
               expect(blockchain.validTransactionData({chain: newChain.chain})).toBe(true);
               expect(errorMock).not.toHaveBeenCalled();
           });
       });
       
       describe('and the transaction data has multiple rewards',()=>{
           it('returns false and logs an error',()=>{
               newChain.addBlock({data: [transaction,rewardTransaction,rewardTransaction]});
               expect(blockchain.validTransactionData({chain: newChain.chain})).toBe(false);
               expect(errorMock).toHaveBeenCalled();
           });
       });
       describe('and the transaction data has at least 1 malformed outputMap',()=>{
           describe('and the transaction is not a rewardTransaction',()=>{
               it('returns false and logs an error',()=>{
                transaction.outputMap[wallet.publicKey]=999999;
                newChain.addBlock({data:[transaction,rewardTransaction]});
                expect(blockchain.validTransactionData({chain: newChain.chain})).toBe(false);
                expect(errorMock).toHaveBeenCalled();
               });
           });
           describe('and the transaction is a rewardTransaction',()=>{
                it('returns false and logs an error',()=>{
                    rewardTransaction.outputMap[wallet.publicKey]=999999;
                    newChain.addBlock({data:[transaction,rewardTransaction]});
                    expect(blockchain.validTransactionData({chain: newChain.chain})).toBe(false);
                    expect(errorMock).toHaveBeenCalled();
                });
           });
       });
       
       describe('and the transaction data as at least 1 malformed input',()=>{
            it('returns false and logs an error',()=>{
               wallet.balance=9000;
               const evilOutputMap = {
                 [wallet.publicKey]:8900,
                 testrecipient:100
               };
               const evilTransaction = {
                 input: {
                     timestamp: Date.now(),
                     amount: wallet.balance,
                     address: wallet.publicKey,
                     signature: wallet.sign(evilOutputMap)
                 },
                 outputMap: evilOutputMap
               };
               newChain.addBlock({data: [evilTransaction,rewardTransaction] });
               expect(blockchain.validTransactionData({chain: newChain.chain})).toBe(false);
               expect(errorMock).toHaveBeenCalled();
            });  
       });
       
       describe('and a block contains multiple identical transactions',()=>{
           it('returns false and logs an error',()=>{
               newChain.addBlock({data:[transaction,transaction,transaction,rewardTransaction] });
                expect(blockchain.validTransactionData({chain: newChain.chain})).toBe(false);
               expect(errorMock).toHaveBeenCalled();
            });
       });
   });
});