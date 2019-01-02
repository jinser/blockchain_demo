const Blockchain = require('./blockchain');

const blockchain = new Blockchain();

blockchain.addBlock({data: 'initial'});

let prevTimestamp, nextTimestamp, nextBlock,timeDiff,average;

const times = [];

for(let i=0;i<10000;i++) {
    prevTimestamp = blockchain.chain[blockchain.chain.length-1].timestamp;
    blockchain.addBlock({data: `block ${i}`});
    //console.log('this is the first block', blockchain.chain[blockchain.chain.length-1]);
    nextBlock = blockchain.chain[blockchain.chain.length-1];
    nextTimestamp = nextBlock.timestamp;
    
    timeDiff = nextTimestamp - prevTimestamp;
    times.push(timeDiff);
    //calculate average of time required
    average = times.reduce((total,num)=>(total+num))/times.length;
    console.log(`Time to mine block: ${timeDiff}ms. Difficulty: ${nextBlock.difficulty}. Average Time: ${average}ms `)
}
