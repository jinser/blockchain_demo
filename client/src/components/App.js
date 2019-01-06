import React,{Component} from 'react';
import {Link} from 'react-router-dom';
import logo from '../assets/logo.png';
import TransactionPool from './TransactionPool';

class App extends Component {
    state = { walletInfo: {} };
    
    //lifecycle hook, good for loading large content quickly
    componentDidMount() {
       fetch(`${document.location.origin}/api/wallet-info`)
       .then(response=>response.json())
       .then(json=>this.setState({walletInfo:json})); 
    }
    
    
    render() {
        const {address, balance} = this.state.walletInfo;
        console.log(document.location.origin);
        return(
            <div className='App'>
                <img className='logo' src={logo}></img>
                <br />
                <div> Welcome to the Blockchain Demo </div>
                <br />
                <div><Link to='/blocks'>Blocks</Link></div>
                <div><Link to='/conduct-transaction'>Conduct a Transaction</Link></div>
                <div><Link to='/transaction-pool'>Transaction Pool</Link></div>
                
                <br />
                <div className='walletInfo'>
                    <div> Address: {address} </div>
                    <div> Balance: {balance} </div>
                </div>
            </div>
        );
    }
}

export default App;