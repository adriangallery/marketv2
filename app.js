// AdrianMarket App JS
// Main application logic

// Global variables
const MARKET_ADDRESS = "0x4B09395Dd0B826Ab3D54272D5dba6769D1640297";
const TOKEN_ADDRESS = "0x7E99075Ce287F1cF8cBCAaa6A1C7894e404fD7Ea"; // $ADRIAN token

// IMPORTANTE: Reemplaza esta clave con tu propia clave API de Alchemy
// Regístrate en https://www.alchemy.com/ para obtener una clave gratuita para Base Mainnet
const ALCHEMY_API_KEY = "fgoABFGfYfI7yIPOSW7_bHPiXLQuHPjU";

// ABIs
const MARKET_ABI = [
  // Core listing functions
  "function createListing(address collection, uint256 tokenId, uint256 quantity, uint256 price, uint256 duration, uint8 nftTypeParam) external",
  "function cancelListing(uint256 listingId) external",
  "function buyListing(uint256 listingId, uint256 purchaseQuantity) external",
  "function getActiveListingsDetailed() external view returns (tuple(uint256 id, address seller, address collection, uint256 tokenId, uint256 quantity, uint256 price, uint256 expirationTime, uint8 nftType)[])",
  "function getMyListings(address seller) external view returns (tuple(uint256 id, address seller, address collection, uint256 tokenId, uint256 quantity, uint256 price, uint256 expirationTime, uint8 nftType)[])",
  
  // Floor offer functions
  "function setFloorOffer(address collection, uint256 offerAmount) external",
  "function acceptFloorOffer(address collection, uint256 tokenId, uint8 nftTypeParam) external",
  "function floorOffers(address collection, uint256) external view returns (bool active, address buyer, uint256 offerAmount)",
  
  // Token offer functions
  "function makeTokenOffer(address collection, uint256 tokenId, uint256 quantity, uint256 offerAmount) external",
  "function withdrawTokenOffer(address collection, uint256 tokenId) external",
  "function acceptTokenOffer(address collection, uint256 tokenId, uint256 offerId, uint8 nftTypeParam) external",
  "function getTokenOffers(address collection, uint256 tokenId) external view returns (tuple(uint256 id, address buyer, uint256 quantity, uint256 offerAmount, bool exists)[])",
  "function getMyTokenOffers(address buyer) external view returns (tuple(uint256 id, address collection, uint256 tokenId, uint256 quantity, uint256 offerAmount, bool exists)[])",
  
  // Trait offer functions
  "function setTraitOffer(string traitType, string traitValue, uint256 offerAmount) external",
  "function cancelTraitOffer(string traitType, string traitValue) external",
  "function acceptTraitOffer(string traitType, string traitValue, uint256 tokenId, address collection, uint8 nftTypeParam) external",
  "function traitOffers(bytes32) external view returns (bool active, address buyer, uint256 offerAmount)",
  
  // Events
  "event FloorOfferSet(address indexed collection, address indexed buyer, uint256 offerAmount)",
  "event TraitOfferSet(string indexed traitType, string indexed traitValue, address indexed buyer, uint256 offerAmount)"
];

const TOKEN_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

const NFT_ABI = [
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function getApproved(uint256 tokenId) view returns (address)",
  "function approve(address to, uint256 tokenId) external",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  "function setApprovalForAll(address operator, bool approved) external"
];

// App state
let provider = null;
let signer = null;
let currentAccount = null;
let marketContract = null;
let tokenContract = null;
let userNFTs = [];
let selectedNFT = null;
let activeListings = [];
let darkMode = false;

// Variables for pagination
let nftPageKey = null;
let hasMoreNFTs = true;

// DOM References
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

// Initialize app
function initializeApp() {
  // Set up event listeners
  setupEventListeners();
  
  // Check if we should show connect message
  if (!window.ethereum) {
    document.getElementById('connect-message').style.display = 'block';
    document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
  } else {
    // Check if wallet is already connected
    checkConnection();
  }
  
  // Check for dark mode preference
  if (localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    darkMode = true;
    document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('theme-icon').className = 'bi bi-sun-fill';
    document.getElementById('theme-text').textContent = 'Modo Claro';
  }
  
  // Start with explore tab active
  setActiveTab('explore');
}

// Setup event listeners
function setupEventListeners() {
  const connectBtn = document.getElementById('connectWalletBtn');
  const connectBtnBig = document.getElementById('connectWalletBtnBig');
  const exploreTab = document.getElementById('explore-tab');
  const myAuctionsTab = document.getElementById('myauctions-tab');
  const createTab = document.getElementById('create-tab');
  const offersTab = document.getElementById('offers-tab');
  const loadMoreNftsBtn = document.getElementById('loadMoreNftsBtn');
  const createListingForm = document.getElementById('create-listing-form');
  
  connectBtn?.addEventListener('click', connectWallet);
  connectBtnBig?.addEventListener('click', connectWallet);
  
  exploreTab?.addEventListener('click', (e) => {
    e.preventDefault();
    setActiveTab('explore');
  });
  
  myAuctionsTab?.addEventListener('click', (e) => {
    e.preventDefault();
    setActiveTab('mylistings');
    if (currentAccount) {
      loadMyListings();
    }
  });
  
  createTab?.addEventListener('click', (e) => {
    e.preventDefault();
    setActiveTab('create');
    if (currentAccount) {
      loadUserNFTs();
    }
  });
  
  offersTab?.addEventListener('click', (e) => {
    e.preventDefault();
    setActiveTab('offers');
    if (currentAccount) {
      loadUserOffers();
    }
  });
  
  loadMoreNftsBtn?.addEventListener('click', () => {
    if (currentAccount && hasMoreNFTs) {
      loadUserNFTs(true); // true = append mode
    }
  });
  
  document.getElementById('createFirstListingBtn')?.addEventListener('click', () => {
    setActiveTab('create');
  });
  
  document.getElementById('createListingBtn')?.addEventListener('click', () => {
    setActiveTab('create');
  });
  
  createListingForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    createListing();
  });
  
  // Set up trait offer form event listener
  document.getElementById('trait-offer-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await createTraitOfferFromForm();
  });
  
  // Set up floor offer form event listener
  document.getElementById('floor-offer-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await createFloorOfferFromForm();
  });
  
  // Trait type selection changes
  document.getElementById('trait-type-select')?.addEventListener('change', handleTraitTypeChange);
}

// Connect wallet
async function connectWallet() {
  try {
    if (!window.ethereum) {
      showNotification('Por favor instala MetaMask para usar este marketplace', 'error');
      return;
    }
    
    // Request account access
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    currentAccount = accounts[0];
    
    // Initialize providers and contracts
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    
    // Create contract instances
    marketContract = new ethers.Contract(MARKET_ADDRESS, MARKET_ABI, signer);
    tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);
    
    // Update UI
    document.getElementById('connect-section').style.display = 'none';
    document.getElementById('account-section').style.display = 'block';
    document.getElementById('walletAddress').textContent = `${currentAccount.slice(0,6)}...${currentAccount.slice(-4)}`;
    document.getElementById('connect-message').style.display = 'none';
    
    // Load data based on current tab
    const activeTab = document.querySelector('.nav-link.active').id;
    if (activeTab === 'explore-tab') {
      loadActiveListings();
    } else if (activeTab === 'myauctions-tab') {
      loadMyListings();
    } else if (activeTab === 'create-tab') {
      loadUserNFTs();
    } else if (activeTab === 'offers-tab') {
      loadUserOffers();
    }
    
    // Event listeners for account/chain changes
    window.ethereum.on('accountsChanged', (accounts) => {
      window.location.reload();
    });
    
    window.ethereum.on('chainChanged', () => {
      window.location.reload();
    });
    
    showNotification('Wallet conectada exitosamente!', 'success');
  } catch (error) {
    console.error("Error de conexión:", error);
    showNotification(error.message || "Fallo al conectar wallet", 'error');
  }
}

// Check if wallet is already connected
async function checkConnection() {
  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        // Auto-connect if user has previously connected
        await connectWallet();
      } else {
        document.getElementById('connect-message').style.display = 'block';
      }
    } catch (error) {
      console.error("Fallo al verificar conexión:", error);
    }
  }
}

// Set active tab
function setActiveTab(tabName) {
  // Update tab links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  document.getElementById(`${tabName}-tab`).classList.add('active');
  
  // Hide all tab contents
  document.querySelectorAll('.tab-content').forEach(content => {
    content.style.display = 'none';
  });
  
  // Show selected tab content
  document.getElementById(`${tabName}-content`).style.display = 'block';
  
  // Load data if needed
  if (currentAccount) {
    if (tabName === 'explore') {
      loadActiveListings();
    } else if (tabName === 'mylistings') {
      loadMyListings();
    } else if (tabName === 'create') {
      loadUserNFTs();
    } else if (tabName === 'offers') {
      loadUserOffers();
    }
  }
}

// Toggle dark/light mode
function toggleTheme() {
  darkMode = !darkMode;
  document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  
  const themeIcon = document.getElementById('theme-icon');
  const themeText = document.getElementById('theme-text');
  
  if (darkMode) {
    themeIcon.className = 'bi bi-sun-fill';
    themeText.textContent = 'Modo Claro';
  } else {
    themeIcon.className = 'bi bi-moon-fill';
    themeText.textContent = 'Modo Oscuro';
  }
  
  // Save preference to localStorage
  localStorage.setItem('theme', darkMode ? 'dark' : 'light');
}

// Show notification
function showNotification(message, type) {
  const notification = document.getElementById('notification');
  
  notification.className = 'notification';
  notification.classList.add(type);
  notification.classList.add('show');
  notification.textContent = message;
  
  // Hide after 5 seconds
  setTimeout(() => {
    notification.classList.remove('show');
  }, 5000);
} 