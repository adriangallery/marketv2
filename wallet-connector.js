// Wallet connector for AdrianMarket
// Supports MetaMask and WalletConnect

// Basic wallet connection handler
class WalletConnector {
  constructor() {
    this.connectedAccount = null;
    this.provider = null;
    this.signer = null;
    this.chainId = null;
    this.isConnected = false;
    this.onAccountChanged = null;
    this.onChainChanged = null;
    this.onConnect = null;
    this.onDisconnect = null;
  }

  // Initialize event listeners
  setEventHandlers(handlers) {
    this.onAccountChanged = handlers.onAccountChanged || null;
    this.onChainChanged = handlers.onChainChanged || null;
    this.onConnect = handlers.onConnect || null;
    this.onDisconnect = handlers.onDisconnect || null;
  }
  
  // Check if a wallet is available
  isWalletAvailable() {
    return window.ethereum !== undefined;
  }
  
  // Get currently connected account
  getAccount() {
    return this.connectedAccount;
  }
  
  // Get provider
  getProvider() {
    return this.provider;
  }
  
  // Get signer
  getSigner() {
    return this.signer;
  }
  
  // Check if connected to the correct network
  async checkNetwork(requiredChainId = 8453) { // Base Mainnet is 8453
    if (!this.isConnected) return false;
    return this.chainId === requiredChainId;
  }
}

// MetaMask wallet connector implementation
class MetaMaskConnector extends WalletConnector {
  constructor() {
    super();
    this.listenToEvents();
  }
  
  // Listen for MetaMask events
  listenToEvents() {
    if (typeof window.ethereum !== 'undefined') {
      // Account change event
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          // Disconnected
          this.isConnected = false;
          this.connectedAccount = null;
          if (this.onDisconnect) this.onDisconnect();
        } else {
          // Account changed
          this.connectedAccount = accounts[0];
          if (this.onAccountChanged) this.onAccountChanged(accounts[0]);
        }
      });
      
      // Chain change event
      window.ethereum.on('chainChanged', (chainId) => {
        this.chainId = parseInt(chainId, 16);
        if (this.onChainChanged) this.onChainChanged(this.chainId);
      });
    }
  }
  
  // Connect to MetaMask
  async connect() {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask is not installed');
    }
    
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Set account and create provider
      this.connectedAccount = accounts[0];
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      this.signer = this.provider.getSigner();
      
      // Get chain ID
      const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
      this.chainId = parseInt(chainIdHex, 16);
      
      this.isConnected = true;
      
      // Trigger connect callback
      if (this.onConnect) this.onConnect({
        account: this.connectedAccount,
        provider: this.provider,
        signer: this.signer,
        chainId: this.chainId
      });
      
      return {
        account: this.connectedAccount,
        provider: this.provider,
        signer: this.signer,
        chainId: this.chainId
      };
    } catch (error) {
      console.error('Failed to connect to MetaMask:', error);
      throw error;
    }
  }
  
  // Check if already connected
  async checkConnection() {
    if (typeof window.ethereum === 'undefined') return false;
    
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      
      if (accounts.length > 0) {
        // Set account and create provider
        this.connectedAccount = accounts[0];
        this.provider = new ethers.providers.Web3Provider(window.ethereum);
        this.signer = this.provider.getSigner();
        
        // Get chain ID
        const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        this.chainId = parseInt(chainIdHex, 16);
        
        this.isConnected = true;
        
        // Trigger connect callback
        if (this.onConnect) this.onConnect({
          account: this.connectedAccount,
          provider: this.provider,
          signer: this.signer,
          chainId: this.chainId
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to check connection:', error);
      return false;
    }
  }
  
  // Switch to a specific network
  async switchNetwork(chainId) {
    if (!this.isConnected) throw new Error('Not connected');
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }]
      });
      
      return true;
    } catch (error) {
      // If the chain is not added, we need to add it
      if (error.code === 4902) {
        try {
          // For Base network
          if (chainId === 8453) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x2105', // 8453 in hex
                chainName: 'Base Mainnet',
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18
                },
                rpcUrls: ['https://mainnet.base.org'],
                blockExplorerUrls: ['https://basescan.org']
              }]
            });
            return true;
          }
        } catch (addError) {
          console.error('Failed to add network:', addError);
          throw addError;
        }
      }
      
      console.error('Failed to switch network:', error);
      throw error;
    }
  }
  
  // Disconnect (MetaMask doesn't have a disconnect method)
  async disconnect() {
    // MetaMask doesn't support programmatic disconnect
    // We can only clear our local state
    this.isConnected = false;
    this.connectedAccount = null;
    this.provider = null;
    this.signer = null;
    
    if (this.onDisconnect) this.onDisconnect();
    
    return true;
  }
}

// Create and export wallet connector instance
const walletsSupported = {
  metamask: new MetaMaskConnector()
};

// Main wallet connect function
async function connectWallet(walletType = 'metamask') {
  if (!walletsSupported[walletType]) {
    throw new Error(`Wallet type ${walletType} not supported`);
  }
  
  return await walletsSupported[walletType].connect();
}

// Check existing connection
async function checkWalletConnection(walletType = 'metamask') {
  if (!walletsSupported[walletType]) return false;
  
  return await walletsSupported[walletType].checkConnection();
}

// Get the active wallet connector
function getWalletConnector(walletType = 'metamask') {
  return walletsSupported[walletType];
}

// Check if a wallet provider is available
function isWalletAvailable(walletType = 'metamask') {
  if (!walletsSupported[walletType]) return false;
  
  return walletsSupported[walletType].isWalletAvailable();
} 