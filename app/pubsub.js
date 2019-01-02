const redis = require('redis');

const CHANNELS ={
    TEST:'TEST',
    BLOCKCHAIN: 'BLOCKCHAIN'
};

class PubSub {
    constructor({blockchain}) {
        this.blockchain=blockchain;
        
        this.publisher= redis.createClient();
        this.subscriber = redis.createClient();
        //this.subscriber.subscribe(CHANNELS.BLOCKCHAIN);
        this.subcribeToChannels();
        
        this.subscriber.on('message',(channel,message)=> this.handleMessage(channel,message));
    }
    
    handleMessage(channel,message) {
        console.log(`message received. Channel: ${channel}. Message:${message}.`);
        const parsedMessage = JSON.parse(message);
        //replace chain if the incoming blockchain is longer
        if(channel===CHANNELS.BLOCKCHAIN) {
            this.blockchain.replaceChain(parsedMessage);
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
}
module.exports=PubSub;
