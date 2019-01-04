const Blockchain = require('./index');
const Block = require('./block');
const {cryptoHash} = require('../util');

describe('Blockchain', ()=> {
   let blockchain,newChain,originalChain;
   
   /*give each following test its own blockchain so that changes made during a test are not propagated to other tests*/
   beforeEach(()=>{
       blockchain =new Blockchain();
       newChain = new Blockchain();
       originalChain = blockchain.chain ;
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
      let errorMock,logMock;
      beforeEach(()=>{
          errorMock=jest.fn();
          logMock=jest.fn();
          global.console.error=errorMock;
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
   });
});