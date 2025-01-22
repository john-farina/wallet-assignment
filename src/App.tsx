import { useState } from 'react';
import { BrowserProvider, formatEther, Contract } from "ethers";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import './App.scss'


const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const ERC20_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const WETH_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)"
];
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

declare global {
  interface Window {
    ethereum?: any;
  }
}

function App() {
  const [account, setAccount] = useState<string>('');
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [balance, setBalance] = useState<string>('');
  const [wethBalance, setWethBalance] = useState<string>('');
  const [erc20Balance, setErc20Balance] = useState<string>('');
  const [ercTokenSymbol, setErcTokenSymbol] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const connectWallet = async () => {
    setIsLoading(true);

    try {
      if (window.ethereum) {
        const provider = new BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);

        const wethContract = new Contract(WETH_ADDRESS, WETH_ABI, provider);
        const erc20Contract = new Contract(ERC20_ADDRESS, ERC20_ABI, provider);

        const balance = await provider.getBalance(accounts[0]);
        const wethBalance = await wethContract.balanceOf(accounts[0]);
        const erc20Balance = await erc20Contract.balanceOf(accounts[0]);
        const symbol = await erc20Contract.symbol();

        setProvider(provider);
        setAccount(accounts[0]);
        setBalance(formatEther(balance));
        setWethBalance(formatEther(wethBalance));
        setErc20Balance(formatEther(erc20Balance));
        setErcTokenSymbol(symbol);

        toast.success("Wallet connected successfully!");

        window.ethereum.on('accountsChanged', handleAccountChange);
        window.ethereum.on('chainChanged', handleChainChange);

        return;
      }

      toast.error("MetaMask not found! Please install MetaMask.");
    } catch (error) {
      toast.error(`Failed to connect wallet! ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountChange = async (accounts: string[]) => {
    if (accounts.length === 0) {
      // DISCONNECTED
      setAccount('');
      setBalance('');
      setWethBalance('');

      return;
    }

    setAccount(accounts[0]);
    updateBalances(accounts[0]);
  };

  const handleChainChange = () => {
    window.location.reload();
  };

  const updateBalances = async (address: string) => {
    if (provider) {
      const balance = await provider.getBalance(address);
      
      const wethContract = new Contract(WETH_ADDRESS, WETH_ABI, provider);
      const wethBalance = await wethContract.balanceOf(address);

      const erc20Contract = new Contract(ERC20_ADDRESS, ERC20_ABI, provider);
      const erc20Balance = await erc20Contract.balanceOf(address);
      const symbol = await erc20Contract.symbol();

      setBalance(formatEther(balance));
      setWethBalance(formatEther(wethBalance));
      setErc20Balance(formatEther(erc20Balance));
      setErcTokenSymbol(symbol);
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <>
      <ToastContainer position="top-right" />

      <main>
        <h1>Web3 Wallet Interface</h1>

        {isLoading ? (
          <div className="loadingContainer">Connecting wallet...</div>
        ) : !account ? (
          <button className="connectBtn" onClick={connectWallet} disabled={isLoading}>
            Connect Wallet
          </button>
        ) : (
          <div className="walletInfo">
            <div className="connectionStatus">
              <div className="greenDot" />
              Connected
            </div>

            <p>Connected Address: {truncateAddress(account)}</p>
            <p>ETH Balance: {balance} ETH</p>
            <p>WETH Balance: {wethBalance} WETH</p>
            <p>ERC20 Token Balance: {erc20Balance} {ercTokenSymbol}</p>
          </div>
        )}
      </main>
    </>
  )
}

export default App