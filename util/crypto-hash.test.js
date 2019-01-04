const cryptoHash = require('./crypto-hash');

describe('cryptoHash()', ()=> {
   
   it('generates SHA-256 hashed output', ()=>{
      expect(cryptoHash('hello')).toEqual('5aa762ae383fbb727af3c7a36d4940a5b8c40a989452d2304fc958ff3f354e7a'); 
   });
   
   it('produce same hash with the same input arguments in any order', ()=> {
      expect(cryptoHash('one','two','three')).toEqual(cryptoHash('two','one','three')); 
   });
   it('produces a unique hash when the properties have changed on an input', ()=>{
      const foo = {};
      const originalHash = cryptoHash(foo);
      foo['a']='a';
      
      expect(cryptoHash(foo)).not.toEqual(originalHash);
   });
});