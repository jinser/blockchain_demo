const Wallet = require('./index');
const {verifySignature} = require('../util');

describe('Wallet', ()=> {
    let wallet;
    beforeEach(() => {
        wallet = new Wallet();
    });
    
    it('has a balance',()=>{
        expect(wallet).toHaveProperty('balance');
    });
    it('has a public key',()=>{
        expect(wallet).toHaveProperty('publicKey');
    });
    
    describe('signing data', ()=>{
        const data = 'test signature data';
        
        it('verifies a signature', ()=>{
            expect(
                verifySignature({
                   publicKey: wallet.publicKey,
                   data,
                   signature: wallet.sign(data)
                })
            ).toBe(true);
        });
        //uses a different wallet's signature, thus is invalid
        it('does not verify an invalid signature',()=>{
            expect(
                verifySignature({
                   publicKey: wallet.publicKey,
                   data,
                   signature: new Wallet().sign(data)
                })
            ).toBe(false);
        });
    });
});