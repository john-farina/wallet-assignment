import { useState } from 'react';
import { BrowserProvider, formatEther, Contract, parseEther } from "ethers";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import './App.scss'


// Main contract addresses
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

// Extended for wrapping
const WETH_ABI_EXTENDED = [
  ...WETH_ABI,
  "function deposit() payable",
  "function withdraw(uint256) external"
];

const ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const ROUTER_ABI = [
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)"
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

  const [wrapAmount, setWrapAmount] = useState<string>('');
  const [swapAmount, setSwapAmount] = useState<string>('');
  const [tokenAddress, setTokenAddress] = useState<string>('');

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

  const wrapEth = async (amount: string) => {
    if (!provider || !account) return;

    try {
      const signer = await provider.getSigner();
      const wethContract = new Contract(WETH_ADDRESS, WETH_ABI_EXTENDED, signer);

      const tx = await wethContract.deposit({
        value: parseEther(amount)
      });

      toast.info("Wrapping ETH...");
      await tx.wait();

      await updateBalances(account);

      toast.success("Successfully wrapped ETH to WETH");
    } catch (error: unknown) {
      const errorMessage = typeof error === 'object' && error !== null && 'code' in error
        ? {
          'INSUFFICIENT_FUNDS': "Insufficient funds to cover gas fees and wrap amount",
          'ACTION_REJECTED': "Transaction rejected by user"
        }[(error as { code: string }).code] || `Failed to wrap ETH: ${(error as { message?: string }).message || String(error)}`
        : `Failed to wrap ETH: ${String(error)}`;

      toast.error(errorMessage);
      console.error(error);
    }
  }; const swapWethForToken = async (wethAmount: string, tokenAddress: string) => {
    if (!provider || !account) return;

    try {
      const signer = await provider.getSigner();
      const router = new Contract(ROUTER_ADDRESS, ROUTER_ABI, signer);

      const path = [WETH_ADDRESS, tokenAddress];
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      const tx = await router.swapExactTokensForTokens(
        parseEther(wethAmount),
        0,
        path,
        account,
        deadline
      );

      toast.info("Swapping WETH for token...");
      await tx.wait();

      await updateBalances(account);
      toast.success("Swap completed successfully!");
    } catch (error) {
      toast.error(`Swap failed: ${error}`);
    }
  };

  return (
    <>
      <ToastContainer position="top-right" />

      <main>
        {isLoading ? (
          <div className="notConnected">
            <div className="dot orange" />
            Connecting to wallet..
          </div>
        ) : !account ? (
          <>
            <div className="notConnected">
              <div className="dot red" />
              Not Connected to a wallet
            </div>

            <button className="connectBtn" onClick={connectWallet} disabled={isLoading}>
              Connect Wallet
            </button>
          </>
        ) : (
          <div className="walletInfo">
            <div className="connectionStatus">
              <div className="greenDot" />
              Connected ( address: <b>{truncateAddress(account)}</b>)
            </div>

            <p className="balanceText">ETH Balance: {balance} ETH</p>
            <p className="balanceText">WETH Balance: {wethBalance} WETH</p>
            <p className="balanceText">ERC20 Token Balance: {erc20Balance} {ercTokenSymbol}</p>

            <div className="actions">
              <div className="form first">
                <p className="label">Wrap ETH</p>

                <input
                  type="number"
                  placeholder="Amount of ETH to wrap"
                  onChange={(e) => setWrapAmount(e.target.value)}
                />
                <button onClick={() => wrapEth(wrapAmount)} disabled={!wrapAmount}>
                  Wrap
                </button>
              </div>

              <div className="form">
                <p className="label">Swap WETH for Token</p>
                <input
                  type="text"
                  placeholder="Token Address"
                  onChange={(e) => setTokenAddress(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="WETH Amount"
                  onChange={(e) => setSwapAmount(e.target.value)}
                />
                <button onClick={() => swapWethForToken(swapAmount, tokenAddress)} disabled={!swapAmount || !tokenAddress}>
                  Swap
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  )
}

export default App;