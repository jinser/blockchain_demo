import React,{Component} from 'react';
import Blocks from './Blocks';
import logo from '../assets/logo.png';

class App extends Component {
    state = { walletInfo: {} };
    
    //lifecycle hook, good for loading large content quickly
    componentDidMount() {
       fetch('https://blockchain-lesson-jin-ser.c9users.io:8080/api/wallet-info')
       .then(response=>response.json())
       .then(json=>this.setState({walletInfo:json})); 
    }
    
    
    render() {
        const {address, balance} = this.state.walletInfo;
        
        return(
            <div className='App'>
                <img className='logo' src={logo}></img>
                <br />
                <div> Welcome to the Blockchain Demo </div>
                <br />
                <div className='walletInfo'>
                    <div> Address: {address} </div>
                    <div> Balance: {balance} </div>
                </div>
                <br />
                <Blocks />
            </div>
        );
    }
}

export default App;