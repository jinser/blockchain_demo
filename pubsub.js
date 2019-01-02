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
        
        this.subcribeToChannels();
        
        this.subscriber.on('message',(channel,message)=> this.handleMessage(channel,message));
    }
    
    handleMessage(channel,message) {
        console.log(`message received. Channel: ${channel}. Message:${message}.`);
        const parsedMessage = JSON.parse(message);
        //repalce chain if the incoming blockchain is longer
        if(channel===CHANNELS.BLOCKCHAIN) {
            this.blockchain.replaceChain(parsedMessage);
        }
    }
    subcribeToChannels() {
        Object.values(CHANNELS).forEach(channel => {
            this.subscriber.subscribe(channel);
        });
    }
    
    publish({channel,message}) {
        this.publisher.publish(channel,message);
    }
    
    broadcastChain() {
        this.publish({
            channel: CHANNELS.BLOCKCHAIN,
            message: JSON.stringify(this.blockchain.chain)
        });
    }
}
module.exports=PubSub;
