// NFT-related functions for AdrianMarket

// Load user's NFTs using Alchemy
async function loadUserNFTs(append = false) {
  if (!currentAccount) return;
  
  const loadingElement = document.getElementById("loading-nfts");
  const noNftsMessage = document.getElementById("no-nfts");
  const nftGrid = document.getElementById("nft-grid");
  const loadMoreContainer = document.getElementById("load-more-nfts");
  
  // Reset state if not appending
  if (!append) {
    loadingElement.style.display = "block";
    noNftsMessage.style.display = "none";
    nftGrid.style.display = "none";
    loadMoreContainer.style.display = "none";
    nftGrid.innerHTML = "";
    document.getElementById('listing-form-card').style.display = 'none';
    selectedNFT = null;
  } else {
    const loadMoreNftsBtn = document.getElementById('loadMoreNftsBtn');
    loadMoreNftsBtn.disabled = true;
    loadMoreNftsBtn.textContent = "Loading...";
  }
  
  try {
    // Use our improved helper function - debug log
    console.log("Fetching NFTs for owner:", currentAccount);
    
    // Use our improved helper function
    const result = await getNFTsForOwner(ALCHEMY_API_KEY, currentAccount, nftPageKey);
    
    // Debug log
    console.log("Alchemy response:", result);
    
    // Update page key for next request
    nftPageKey = result.pageKey;
    hasMoreNFTs = nftPageKey !== undefined && nftPageKey !== null;
    
    if (result.nfts && result.nfts.length > 0) {
      // Add to or replace existing NFTs
      if (append) {
        userNFTs = [...userNFTs, ...result.nfts];
      } else {
        userNFTs = result.nfts;
      }
      
      // Display NFTs
      if (!append) {
        nftGrid.innerHTML = '';
      }
      
      result.nfts.forEach(nft => {
        const isSelected = selectedNFT && selectedNFT.tokenId === nft.tokenId && selectedNFT.contract === nft.contract;
        
        // Debug log for each NFT
        console.log("NFT data:", nft);
        
        // Make sure image URL is valid
        let imageUrl = nft.image;
        if (!imageUrl || imageUrl === 'undefined' || imageUrl === '') {
          imageUrl = 'https://placehold.co/400x400?text=NFT+Image';
        }
        
        // Check for metadata and attributes
        const hasAttributes = nft.attributes && nft.attributes.length > 0;
        const attrCount = hasAttributes ? nft.attributes.length : 0;
        
        const cardDiv = document.createElement('div');
        cardDiv.className = 'col';
        cardDiv.innerHTML = `
          <div class="card nft-card ${isSelected ? 'selected' : ''}">
            <div class="nft-image-container">
              <img src="${imageUrl}" class="nft-image" alt="${nft.title}" 
                   onerror="this.src='https://placehold.co/400x400?text=NFT+Image'">
            </div>
            <div class="card-body">
              <h5 class="card-title">${nft.title}</h5>
              <p class="card-text text-muted">ID: ${nft.tokenId}</p>
              ${hasAttributes ? `<span class="badge bg-info">${attrCount} Traits</span>` : ''}
              ${isSelected ? '<span class="badge status-live ms-2">Selected</span>' : ''}
            </div>
          </div>
        `;
        
        cardDiv.querySelector('.nft-card').addEventListener('click', () => selectNFT(nft));
        nftGrid.appendChild(cardDiv);
      });
      
      loadingElement.style.display = "none";
      nftGrid.style.display = "block";
      loadMoreContainer.style.display = hasMoreNFTs ? "block" : "none";
      
      const loadMoreNftsBtn = document.getElementById('loadMoreNftsBtn');
      if (loadMoreNftsBtn) {
        loadMoreNftsBtn.disabled = false;
        loadMoreNftsBtn.textContent = "Load More NFTs";
      }
    } else {
      if (!append) {
        loadingElement.style.display = "none";
        noNftsMessage.style.display = "block";
      } else {
        const loadMoreNftsBtn = document.getElementById('loadMoreNftsBtn');
        if (loadMoreNftsBtn) {
          loadMoreNftsBtn.textContent = "No More NFTs";
          setTimeout(() => {
            loadMoreContainer.style.display = "none";
          }, 2000);
        }
      }
    }
  } catch (error) {
    console.error("Error loading NFTs:", error);
    loadingElement.style.display = "none";
    
    if (append) {
      const loadMoreNftsBtn = document.getElementById('loadMoreNftsBtn');
      if (loadMoreNftsBtn) {
        loadMoreNftsBtn.disabled = false;
        loadMoreNftsBtn.textContent = "Load More NFTs";
      }
      showNotification("Failed to load more NFTs. Please try again.", 'error');
    } else {
      noNftsMessage.style.display = "block";
      showNotification("Failed to load your NFTs. Please try again later.", 'error');
    }
  }
}

// Select NFT for listing
function selectNFT(nft) {
  selectedNFT = nft;
  
  // Update NFT cards
  const nftCards = document.querySelectorAll('.nft-card');
  nftCards.forEach(card => {
    card.classList.remove('selected');
  });
  
  // Find the card for this NFT and mark it as selected
  const selectedCard = Array.from(nftCards).find(card => {
    const titleEl = card.querySelector('.card-title');
    const idEl = card.querySelector('.card-text');
    return titleEl.textContent === nft.title && 
           idEl.textContent.includes(nft.tokenId.toString());
  });
  
  if (selectedCard) {
    selectedCard.classList.add('selected');
  }
  
  // Update listing form
  document.getElementById('listing-form-card').style.display = 'block';
  document.getElementById('selected-nft-image').src = nft.image;
  document.getElementById('selected-nft-title').textContent = nft.title;
  document.getElementById('selected-nft-id').textContent = `ID: ${nft.tokenId}`;
  
  showNotification(`${nft.title} selected for listing`, 'info');
}

// Create a listing
async function createListing() {
  if (!selectedNFT || !marketContract || !signer) {
    showNotification('Please connect your wallet and select an NFT first', 'error');
    return;
  }
  
  const price = document.getElementById('listing-price').value;
  const duration = document.getElementById('listing-duration').value;
  
  if (!price || parseFloat(price) <= 0) {
    showNotification('Please enter a valid price', 'error');
    return;
  }
  
  if (!duration || parseInt(duration) < 1) {
    showNotification('Duration must be at least 1 day', 'error');
    return;
  }
  
  try {
    // Step 1: Approve the NFT for the marketplace
    const nftContract = new ethers.Contract(selectedNFT.contract, NFT_ABI, signer);
    
    // Check if approval is already given
    const isApproved = await nftContract.isApprovedForAll(currentAccount, MARKET_ADDRESS);
    
    if (!isApproved) {
      showNotification('Approving NFT for the marketplace...', 'info');
      const approveTx = await nftContract.setApprovalForAll(MARKET_ADDRESS, true);
      await approveTx.wait();
    }
    
    // Step 2: Create the listing
    const priceWei = ethers.utils.parseEther(price.toString());
    const durationSeconds = parseInt(duration) * 24 * 60 * 60; // Convert days to seconds
    
    showNotification('Creating listing...', 'info');
    
    const tx = await marketContract.createListing(
      selectedNFT.contract,
      selectedNFT.tokenId,
      1, // Quantity is 1 for ERC721
      priceWei,
      durationSeconds,
      1, // NFT type 1 = ERC721
      { gasLimit: 1000000 }
    );
    
    await tx.wait();
    
    showNotification('Listing created successfully!', 'success');
    
    // Reset form and selection
    document.getElementById('listing-price').value = '';
    document.getElementById('listing-duration').value = '7';
    document.getElementById('listing-form-card').style.display = 'none';
    selectedNFT = null;
    
    // Reload NFTs to show updated state
    loadUserNFTs();
    
    // Switch to listings tab
    setActiveTab('mylistings');
    
  } catch (error) {
    console.error('Error creating listing:', error);
    showNotification('Failed to create listing: ' + error.message, 'error');
  }
}

// Load active listings
async function loadActiveListings() {
  const loadingElement = document.getElementById("loading-listings");
  const noListingsMessage = document.getElementById("no-listings");
  const listingsGrid = document.getElementById("listings-grid");
  const loadMoreBtn = document.getElementById("load-more-listings");
  
  loadingElement.style.display = "block";
  noListingsMessage.style.display = "none";
  listingsGrid.style.display = "none";
  loadMoreBtn.style.display = "none";
  
  try {
    if (!marketContract) {
      // Create a read-only contract instance
      const readProvider = new ethers.providers.JsonRpcProvider(`https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`);
      const readContract = new ethers.Contract(MARKET_ADDRESS, MARKET_ABI, readProvider);
      
      const listings = await readContract.getActiveListingsDetailed();
      processListings(listings);
    } else {
      const listings = await marketContract.getActiveListingsDetailed();
      processListings(listings);
    }
  } catch (error) {
    console.error("Error loading listings:", error);
    loadingElement.style.display = "none";
    noListingsMessage.style.display = "block";
    showNotification("Failed to load marketplace listings. Please try again later.", 'error');
  }
  
  async function processListings(listings) {
    // Filter listings that haven't expired
    const currentTimestamp = Math.floor(Date.now() / 1000);
    activeListings = listings.filter(listing => {
      return listing.expirationTime.toNumber() > currentTimestamp;
    });
    
    if (activeListings.length === 0) {
      loadingElement.style.display = "none";
      noListingsMessage.style.display = "block";
      return;
    }
    
    // Process and display listings
    listingsGrid.innerHTML = '';
    
    for (const listing of activeListings) {
      try {
        // Fetch NFT metadata from Alchemy
        const nftMetadata = await getNFTMetadata(
          ALCHEMY_API_KEY,
          listing.collection,
          listing.tokenId.toString()
        );
        
        // Format expiration
        const timeString = formatTimeRemaining(listing.expirationTime.toNumber());
        
        // Create listing card
        const listingDiv = document.createElement('div');
        listingDiv.className = 'col';
        
        const price = ethers.utils.formatEther(listing.price);
        const isOwner = currentAccount && listing.seller.toLowerCase() === currentAccount.toLowerCase();
        
        listingDiv.innerHTML = `
          <div class="card h-100">
            <div class="nft-image-container">
              <img src="${nftMetadata.image}" class="nft-image" alt="${nftMetadata.title}" 
                   onerror="this.src='https://placehold.co/400x400?text=NFT+Image'">
            </div>
            <div class="card-body">
              <h5 class="card-title">${nftMetadata.title}</h5>
              <p class="card-text"><strong>${price} $ADRIAN</strong></p>
              <p class="card-text text-muted">${timeString}</p>
              <div class="d-grid gap-2">
                ${isOwner ? 
                  `<button class="btn btn-danger btn-sm cancel-listing-btn" data-listing-id="${listing.id}">
                    Cancel Listing
                  </button>` : 
                  `<button class="btn btn-success btn-sm buy-listing-btn" data-listing-id="${listing.id}" data-price="${price}">
                    Buy Now
                  </button>`
                }
                <button class="btn btn-outline-secondary btn-sm view-details-btn" data-listing-id="${listing.id}">
                  View Details
                </button>
              </div>
            </div>
          </div>
        `;
        
        listingsGrid.appendChild(listingDiv);
      } catch (listingError) {
        console.error(`Error processing listing ${listing.id}:`, listingError);
      }
    }
    
    // Add event listeners to buttons
    document.querySelectorAll('.cancel-listing-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const listingId = btn.getAttribute('data-listing-id');
        cancelListing(listingId);
      });
    });
    
    document.querySelectorAll('.buy-listing-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const listingId = btn.getAttribute('data-listing-id');
        const price = btn.getAttribute('data-price');
        buyListing(listingId, price);
      });
    });
    
    document.querySelectorAll('.view-details-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const listingId = btn.getAttribute('data-listing-id');
        showListingDetails(listingId);
      });
    });
    
    loadingElement.style.display = "none";
    listingsGrid.style.display = "block";
  }
}

// Load my listings
async function loadMyListings() {
  if (!currentAccount) return;
  
  const loadingElement = document.getElementById("loading-my-listings");
  const noListingsMessage = document.getElementById("no-my-listings");
  const listingsGrid = document.getElementById("my-listings-grid");
  
  loadingElement.style.display = "block";
  noListingsMessage.style.display = "none";
  listingsGrid.style.display = "none";
  
  try {
    if (!marketContract) {
      // Create contract instance if needed
      const readProvider = new ethers.providers.JsonRpcProvider(`https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`);
      const readContract = new ethers.Contract(MARKET_ADDRESS, MARKET_ABI, readProvider);
      
      // Using getMyListings function that takes a seller address
      const listings = await readContract.getMyListings(currentAccount);
      processListings(listings);
    } else {
      const listings = await marketContract.getMyListings(currentAccount);
      processListings(listings);
    }
  } catch (error) {
    console.error("Error loading my listings:", error);
    loadingElement.style.display = "none";
    noListingsMessage.style.display = "block";
    showNotification("Failed to load your listings. Please try again later.", 'error');
  }
  
  async function processListings(listings) {
    // Filter listings that haven't expired
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const myActiveListings = listings.filter(listing => {
      return listing.expirationTime.toNumber() > currentTimestamp;
    });
    
    if (myActiveListings.length === 0) {
      loadingElement.style.display = "none";
      noListingsMessage.style.display = "block";
      return;
    }
    
    // Process and display listings
    listingsGrid.innerHTML = '';
    
    for (const listing of myActiveListings) {
      try {
        // Fetch NFT metadata from Alchemy
        const nftMetadata = await getNFTMetadata(
          ALCHEMY_API_KEY,
          listing.collection,
          listing.tokenId.toString()
        );
        
        // Format expiration
        const timeString = formatTimeRemaining(listing.expirationTime.toNumber());
        
        // Create listing card
        const listingDiv = document.createElement('div');
        listingDiv.className = 'col';
        
        const price = ethers.utils.formatEther(listing.price);
        
        listingDiv.innerHTML = `
          <div class="card h-100">
            <div class="nft-image-container">
              <img src="${nftMetadata.image}" class="nft-image" alt="${nftMetadata.title}" 
                   onerror="this.src='https://placehold.co/400x400?text=NFT+Image'">
            </div>
            <div class="card-body">
              <h5 class="card-title">${nftMetadata.title}</h5>
              <p class="card-text"><strong>${price} $ADRIAN</strong></p>
              <p class="card-text text-muted">${timeString}</p>
              <div class="d-grid gap-2">
                <button class="btn btn-danger btn-sm cancel-listing-btn" data-listing-id="${listing.id}">
                  Cancel Listing
                </button>
                <button class="btn btn-outline-secondary btn-sm view-details-btn" data-listing-id="${listing.id}">
                  View Details
                </button>
              </div>
            </div>
          </div>
        `;
        
        listingsGrid.appendChild(listingDiv);
      } catch (listingError) {
        console.error(`Error processing listing ${listing.id}:`, listingError);
      }
    }
    
    // Add event listeners to buttons
    document.querySelectorAll('.cancel-listing-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const listingId = btn.getAttribute('data-listing-id');
        cancelListing(listingId);
      });
    });
    
    document.querySelectorAll('.view-details-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const listingId = btn.getAttribute('data-listing-id');
        showListingDetails(listingId);
      });
    });
    
    loadingElement.style.display = "none";
    listingsGrid.style.display = "block";
  }
}

// Cancel a listing
async function cancelListing(listingId) {
  if (!marketContract || !signer) {
    showNotification('Please connect your wallet first', 'error');
    return;
  }
  
  try {
    showNotification('Cancelling listing...', 'info');
    const tx = await marketContract.cancelListing(listingId, { gasLimit: 1000000 });
    await tx.wait();
    
    showNotification('Listing cancelled successfully!', 'success');
    
    // Reload listings
    const activeTab = document.querySelector('.nav-link.active').id;
    if (activeTab === 'explore-tab') {
      loadActiveListings();
    } else if (activeTab === 'myauctions-tab') {
      loadMyListings();
    }
    
  } catch (error) {
    console.error('Error cancelling listing:', error);
    showNotification('Failed to cancel listing: ' + error.message, 'error');
  }
}

// Buy a listed NFT
async function buyListing(listingId, price) {
  if (!marketContract || !signer) {
    showNotification('Please connect your wallet first', 'error');
    return;
  }
  
  try {
    // Approve tokens for marketplace if needed
    const priceWei = ethers.utils.parseEther(price.toString());
    const allowance = await tokenContract.allowance(currentAccount, MARKET_ADDRESS);
    
    if (allowance.lt(priceWei)) {
      showNotification('Approving tokens for purchase...', 'info');
      const approveTx = await tokenContract.approve(MARKET_ADDRESS, priceWei);
      await approveTx.wait();
    }
    
    // Buy the NFT
    showNotification('Processing purchase...', 'info');
    const buyTx = await marketContract.buyListing(listingId, 1, { gasLimit: 1000000 });
    await buyTx.wait();
    
    showNotification('Purchase successful!', 'success');
    
    // Reload listings
    loadActiveListings();
    
  } catch (error) {
    console.error('Error buying NFT:', error);
    showNotification('Failed to purchase NFT: ' + error.message, 'error');
  }
} 