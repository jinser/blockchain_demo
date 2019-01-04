const redis = require('redis');

const CHANNELS ={
    TEST:'TEST',
    BLOCKCHAIN: 'BLOCKCHAIN',
    TRANSACTION: 'TRANSACTION'
};

class PubSub {
    constructor({blockchain,transactionPool,wallet}) {
        this.blockchain=blockchain;
        this.transactionPool = transactionPool;
        this.wallet = wallet;
        
        this.publisher= redis.createClient();
        this.subscriber = redis.createClient();
        //this.subscriber.subscribe(CHANNELS.BLOCKCHAIN);
        this.subcribeToChannels();
        
        this.subscriber.on('message',(channel,message)=> this.handleMessage(channel,message));
    }
    
    handleMessage(channel,message) {
        console.log(`message received. Channel: ${channel}. Message:${message}.`);
        const parsedMessage = JSON.parse(message);
       
        switch(channel) {
            case CHANNELS.BLOCKCHAIN:  //replace chain if the incoming blockchain is longer
                this.blockchain.replaceChain(parsedMessage);
                break;
            case CHANNELS.TRANSACTION:
                /*handle pubsub edge case -> when creating 2 txn from the same wallet, 2nd txn returns an error because
                pubnub does not prevent self-broadcasts.
                pubnub does not take callback functionsto fire when subscribe/unsubscribe/publish functions complete as it happens
                asynchronously. 
                Self-broadcast/self-publish will overwrite the existing transaction instance
                */
                if(!this.transactionPool.existingTransaction({inputAddress: this.wallet.publicKey})) {
                    this.transactionPool.setTransaction(parsedMessage);    
                }
                break;
            default:
                return;
        }
    }
    subcribeToChannels() {
        Object.keys(CHANNELS).forEach(key => {
            let channel = CHANNELS[key];
            this.subscriber.subscribe(channel);
        });
        /* does not work for node version < 7.0.0, 
         * Will get the error Uncaught TypeError: Object.values is not a function JavaScript

        Object.values(CHANNELS).forEach(channel => {
            this.subscriber.subscribe(channel);
        });*/
    }
    
    publish({channel,message}) {
        this.subscriber.unsubscribe(channel,()=>{
            this.publisher.publish(channel,message,()=>{
                this.subscriber.subscribe(channel);
            });
        });
    }
    
    broadcastChain() {
        this.publish({
            channel: CHANNELS.BLOCKCHAIN,
            message: JSON.stringify(this.blockchain.chain)
        });
    }
    
    broadcastTransaction(transaction) {
        this.publish({
            channel: CHANNELS.TRANSACTION,
            message: JSON.stringify(transaction)
        });
    }
}
module.exports=PubSub;
