const cryptoHash = require('./crypto-hash');

describe('cryptoHash()', ()=> {
   
   it('generates SHA-256 hashed output', ()=>{
      expect(cryptoHash('hello')).toEqual('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'); 
   });
   
   it('produce same hash with the same input arguments in any order', ()=> {
      expect(cryptoHash('one','two','three')).toEqual(cryptoHash('two','one','three')); 
   });
});