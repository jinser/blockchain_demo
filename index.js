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

const app = express();
app.use(cors());
const blockchain = new Blockchain();
const transactionPool = new TransactionPool();
const wallet = new Wallet();
const pubsub = new PubSub({blockchain,transactionPool,wallet});
const transactionMiner = new TransactionMiner({blockchain,transactionPool,wallet,pubsub});

const ROOT_NODE_ADDRESS = 'https://blockchain-lesson-jin-ser.c9users.io';
//for running on cloud9 IDE, otherwise this should be `http://localhost:${DEFAULT_PORT}`

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname,'client/dist')));

app.get('/api/blocks',(req,res)=>{
    res.json(blockchain.chain);
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

/*
    Test Code to generate test blocks for Dev UI purposes
*/
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
        walletTwoAction();
    } else if(i%3 === 1) {
        walletAction();
        walletTwoAction();
    } else {
        walletOneAction();
        walletTwoAction();
    }
    transactionMiner.mineTransactions();
}
/*
    END OF DEV CODE
*/

const DEFAULT_PORT = 8080;
let PEER_PORT;

if(process.env.GENERATE_PEER_PORT==='true'){
    //PEER_PORT=DEFAULT_PORT + Math.ceil(Math.random() *1000);
    PEER_PORT=8081 //since cloud9 restricts ports;
}
const PORT = PEER_PORT || DEFAULT_PORT;
app.listen(PORT,()=> {
    console.log(`listening at localhost:${PORT}`);
    if(PORT!==DEFAULT_PORT) {
        syncWithRootState();    
    }
    
});