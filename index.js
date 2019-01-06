const express = require('express');
const request = require('request');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors')

const Blockchain = require('./blockchain/index');
const PubSub = require('./app/pubsub');
const TransactionPool = require('./wallet/transaction-pool');
const Wallet = require('./wallet');
const TransactionMiner = require('./app/transaction-miner');

/*Environment dependent variables*/
const isDevelopment = process.env.ENV === 'development';
const DEFAULT_PORT = 8080;
//for running on cloud9 IDE use the open port 8080, otherwise this should be `http://localhost:${DEFAULT_PORT}`
const ROOT_NODE_ADDRESS = isDevelopment ? 'https://blockchain-lesson-jin-ser.c9users.io' : `http://localhost:${DEFAULT_PORT}`;
const REDIS_URL = isDevelopment ? 'redis://127.0.0.1:6379' : 'redis://h:pf1d1bc0e318b480bf68e094760997f57c0fbd6af55ff523d167faf561dc1ba4e@ec2-18-215-97-111.compute-1.amazonaws.com:31739';

const app = express();
app.use(cors());
const blockchain = new Blockchain();
const transactionPool = new TransactionPool();
const wallet = new Wallet();
const pubsub = new PubSub({blockchain,transactionPool,wallet,redisUrl:REDIS_URL});
const transactionMiner = new TransactionMiner({blockchain,transactionPool,wallet,pubsub});

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname,'client/dist')));

app.get('/api/blocks',(req,res)=>{
    res.json(blockchain.chain);
});

app.get('/api/blocks/length',(req,res)=>{
    res.json(blockchain.chain.length);
});

app.get('/api/blocks/:id',(req,res)=>{
    const {id } = req.params;
    const {length} = blockchain.chain;
    
    const blocksReversed = blockchain.chain.slice().reverse();
    let startIndex = (id-1)*5;
    let endIndex = id * 5;
    
    startIndex = startIndex < length ? startIndex : length;
    endIndex = endIndex < length ? endIndex : length;
    res.json(blocksReversed.slice(startIndex,endIndex));
});

app.post('/api/mine',(req,res) => {
    const {data} = req.body;
    blockchain.addBlock({data});
    pubsub.broadcastChain();
    res.redirect('/api/blocks');
});

app.post('/api/transact',(req,res)=>{
    const {amount,recipient} = req.body;
    
    let transaction = transactionPool.existingTransaction({inputAddress: wallet.publicKey});
    try{
        if(transaction) {
            transaction.update({senderWallet:wallet,recipient,amount});
        } else {
            transaction = wallet.createTransaction({
                recipient,
                amount,
                chain:blockchain.chain
            });    
        }
    } catch (error) {
        return res.status(400).json({type: 'error',message:error.message});
    }
    
    transactionPool.setTransaction(transaction);
    pubsub.broadcastTransaction(transaction);
    
    res.json({ type:'success',transaction });
});

app.get('/api/transaction-pool-map',(req,res)=> {
    res.json(transactionPool.transactionMap);
});

app.get('/api/mine-transactions',(req,res)=>{
    transactionMiner.mineTransactions();
    res.redirect('/api/blocks');
});

app.get('/api/wallet-info',(req,res)=>{
    const address = wallet.publicKey;
   res.json({
       address,
       balance:Wallet.calculateBalance({chain:blockchain.chain,address})
   });
});

app.get('/api/known-addresses',(req,res)=>{
   const addressMap = {};
   
   for(let block of blockchain.chain) {
       for(let transaction of block.data) {
           const recipient = Object.keys(transaction.outputMap);
           recipient.forEach(recipient=> addressMap[recipient] = recipient );
       }
   }
   res.json(Object.keys(addressMap));
});

app.get('*',(req,res)=>{
    res.sendFile(path.join(__dirname,'client/dist/index.html'));
});

const syncWithRootState = () => {
    request({url: `${ROOT_NODE_ADDRESS}/api/blocks` },(error,response,body) => {
        if(!error && response.statusCode === 200) {
            const rootChain = JSON.parse(body);
            console.log('replace chain on a sync with', rootChain);
            blockchain.replaceChain(rootChain);
        }
    });
    
    request({url: `${ROOT_NODE_ADDRESS}/api/transaction-pool-map` },(error,response,body) => {
        if(!error && response.statusCode === 200) {
            const rootTransactionPoolMap = JSON.parse(body);
            console.log('replace transaction pool map on a sync with',rootTransactionPoolMap);
            transactionPool.setMap(rootTransactionPoolMap);
        }
    });
}

let PEER_PORT;

if(process.env.GENERATE_PEER_PORT==='true'){
    //PEER_PORT=DEFAULT_PORT + Math.ceil(Math.random() *1000);
    PEER_PORT=8082 //since cloud9 restricts ports;
}
const PORT = PEER_PORT || DEFAULT_PORT;
app.listen(PORT,()=> {
    console.log(`listening at localhost:${PORT}`);
    if(PORT!==DEFAULT_PORT) {
        syncWithRootState();    
    }

/*
    Test Code to generate test blocks for Dev UI purposes
*/

if(isDevelopment) {
    
    const walletDemoOne =  new Wallet();
    const walletDemoTwo = new Wallet();
    
    const generateWalletTransaction = ({wallet,recipient,amount}) => {
      const transaction = wallet.createTransaction({
          recipient,
          amount,
          chain: blockchain.chain
      });
      transactionPool.setTransaction(transaction);
    };
    const walletAction = () => generateWalletTransaction ({
        wallet,
        recipient: walletDemoOne.publicKey,
        amount: 5
    });
    
    const walletOneAction = () => generateWalletTransaction ({
       wallet: walletDemoOne,
       recipient: walletDemoTwo.publicKey,
       amount: 10
    });
    const walletTwoAction = () => generateWalletTransaction ({
       wallet: walletDemoTwo,
       recipient: wallet.publicKey,
       amount: 15
    });
    
    for(let i=0;i<10;i++) {
        if(i%3 === 0) {
            walletAction();
            walletOneAction();
        } else if(i%3 === 1) {
            walletAction();
            walletTwoAction();
        } else {
            walletOneAction();
            walletTwoAction();
        }
        transactionMiner.mineTransactions();
    }
}
/*
    END OF DEV CODE
*/

});