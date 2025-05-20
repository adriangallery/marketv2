// Offer-related functions for AdrianMarket

// Show listing details in modal
async function showListingDetails(listingId) {
  const listing = activeListings.find(l => l.id.toString() === listingId.toString());
  if (!listing) return;
  
  try {
    // Fetch NFT metadata from Alchemy
    const nftMetadata = await getNFTMetadata(
      ALCHEMY_API_KEY,
      listing.collection,
      listing.tokenId.toString()
    );
    
    // Format time remaining
    const timeString = formatTimeRemaining(listing.expirationTime.toNumber());
    
    // Populate modal
    document.getElementById('modal-nft-title').textContent = nftMetadata.title;
    document.getElementById('modal-nft-image').src = nftMetadata.image;
    document.getElementById('modal-nft-description').textContent = nftMetadata.description || 'No hay descripción disponible';
    document.getElementById('modal-nft-contract').textContent = `${listing.collection.substring(0,6)}...${listing.collection.substring(38)}`;
    document.getElementById('modal-nft-token-id').textContent = listing.tokenId.toString();
    
    // Populate traits/attributes if available
    const attributesContainer = document.getElementById('nft-attributes-container');
    attributesContainer.innerHTML = '';
    
    if (nftMetadata.attributes && nftMetadata.attributes.length > 0) {
      document.getElementById('nft-attributes-section').style.display = 'block';
      
      nftMetadata.attributes.forEach(attr => {
        if (attr.trait_type && attr.value) {
          const attrDiv = document.createElement('div');
          attrDiv.className = 'attribute-badge';
          attrDiv.innerHTML = `
            <span class="trait-type">${attr.trait_type}</span>
            <span class="trait-value">${attr.value}</span>
          `;
          attributesContainer.appendChild(attrDiv);
        }
      });
    } else {
      document.getElementById('nft-attributes-section').style.display = 'none';
    }
    
    // Show listing info
    document.getElementById('listing-info').style.display = 'block';
    document.getElementById('modal-listing-price').textContent = `${ethers.utils.formatEther(listing.price)} $ADRIAN`;
    document.getElementById('modal-listing-expiration').textContent = timeString;
    
    // Set up actions
    const actionsContainer = document.getElementById('listing-actions');
    const isOwner = currentAccount && listing.seller.toLowerCase() === currentAccount.toLowerCase();
    
    if (isOwner) {
      actionsContainer.innerHTML = `
        <button class="btn btn-danger w-100 cancel-modal-listing-btn" data-listing-id="${listing.id}">
          Cancelar Listado
        </button>
      `;
      
      document.querySelector('.cancel-modal-listing-btn').addEventListener('click', () => {
        cancelListing(listing.id);
        const modal = bootstrap.Modal.getInstance(document.getElementById('nftModal'));
        modal.hide();
      });
      
      // Hide offer actions section for owners
      document.getElementById('offer-actions-section').style.display = 'none';
    } else {
      actionsContainer.innerHTML = `
        <button class="btn btn-success w-100 buy-modal-listing-btn" data-listing-id="${listing.id}" data-price="${ethers.utils.formatEther(listing.price)}">
          Comprar Ahora
        </button>
      `;
      
      document.querySelector('.buy-modal-listing-btn').addEventListener('click', () => {
        const listingId = document.querySelector('.buy-modal-listing-btn').getAttribute('data-listing-id');
        const price = document.querySelector('.buy-modal-listing-btn').getAttribute('data-price');
        buyListing(listingId, price);
        const modal = bootstrap.Modal.getInstance(document.getElementById('nftModal'));
        modal.hide();
      });
      
      // Show offer actions section
      document.getElementById('offer-actions-section').style.display = 'block';
      
      // Load and display floor offer
      loadFloorOffer(listing.collection);
      
      // Set up token offer form
      document.getElementById('token-offer-form').style.display = 'block';
      document.getElementById('make-token-offer-btn').onclick = () => {
        const offerAmount = document.getElementById('token-offer-amount').value;
        makeTokenOffer(listing.collection, listing.tokenId, offerAmount);
      };
      
      // Hide accept offers section if not owner
      document.getElementById('accept-offers-section').style.display = 'none';
    }
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('nftModal'));
    modal.show();
  } catch (error) {
    console.error('Error al mostrar detalles del listado:', error);
    showNotification('Error al cargar detalles del listado', 'error');
  }
}

// Load floor offer for a collection
async function loadFloorOffer(collection) {
  if (!marketContract) return;
  
  try {
    const floorOfferInfo = document.getElementById('floor-offer-info');
    const floorOfferAmount = document.getElementById('floor-offer-amount');
    const acceptFloorOfferBtn = document.getElementById('accept-floor-offer-btn');
    
    // Get floor offer
    const result = await getFloorOffer(marketContract, collection);
    
    if (result.exists && result.active) {
      floorOfferAmount.textContent = result.amount;
      floorOfferInfo.style.display = 'block';
      
      // Set up accept button
      acceptFloorOfferBtn.onclick = async () => {
        // Get the NFT data from the modal
        const tokenId = document.getElementById('modal-nft-token-id').textContent;
        
        // Create NFT contract instance
        const nftContract = new ethers.Contract(collection, NFT_ABI, signer);
        
        // Try to accept floor offer
        const acceptResult = await acceptFloorOffer(
          marketContract,
          nftContract,
          tokenId,
          1, // NFT type 1 = ERC721
          signer
        );
        
        if (acceptResult.success) {
          showNotification('¡Oferta de piso aceptada exitosamente!', 'success');
          // Close modal
          const modal = bootstrap.Modal.getInstance(document.getElementById('nftModal'));
          modal.hide();
        } else {
          showNotification('Error al aceptar oferta de piso: ' + acceptResult.error, 'error');
        }
      };
    } else {
      floorOfferInfo.style.display = 'none';
    }
  } catch (error) {
    console.error('Error al cargar oferta de piso:', error);
    document.getElementById('floor-offer-info').style.display = 'none';
  }
}

// Make token offer for a specific NFT
async function makeTokenOffer(collection, tokenId, offerAmount) {
  if (!marketContract || !tokenContract || !signer) {
    showNotification('Por favor conecta tu wallet primero', 'error');
    return;
  }
  
  if (!offerAmount || parseFloat(offerAmount) <= 0) {
    showNotification('Por favor ingresa una cantidad de oferta válida', 'error');
    return;
  }
  
  try {
    // Create token offer
    const result = await createTokenOffer(
      marketContract,
      tokenContract,
      collection,
      tokenId,
      1, // Quantity is 1 for ERC721
      offerAmount,
      signer
    );
    
    if (result.success) {
      showNotification('¡Oferta creada exitosamente!', 'success');
      
      // Clear form
      document.getElementById('token-offer-amount').value = '';
      
      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('nftModal'));
      modal.hide();
    } else {
      showNotification('Error al crear oferta: ' + result.error, 'error');
    }
  } catch (error) {
    console.error('Error al crear oferta de token:', error);
    showNotification('Error al crear oferta: ' + error.message, 'error');
  }
}

// Create trait offer from form
async function createTraitOfferFromForm() {
  if (!marketContract || !tokenContract || !signer) {
    showNotification('Por favor conecta tu wallet primero', 'error');
    return;
  }
  
  const traitType = document.getElementById('trait-type-select').value;
  const traitValue = document.getElementById('trait-value-select').value;
  const offerAmount = document.getElementById('trait-offer-amount').value;
  
  if (!traitType || !traitValue) {
    showNotification('Por favor selecciona un tipo y valor de rasgo', 'error');
    return;
  }
  
  if (!offerAmount || parseFloat(offerAmount) <= 0) {
    showNotification('Por favor ingresa una cantidad de oferta válida', 'error');
    return;
  }
  
  try {
    // Create trait offer
    const result = await createTraitOffer(
      marketContract,
      tokenContract,
      traitType,
      traitValue,
      offerAmount,
      signer
    );
    
    if (result.success) {
      showNotification('¡Oferta por rasgo creada exitosamente!', 'success');
      
      // Clear form and close modal
      document.getElementById('trait-offer-amount').value = '';
      const modal = bootstrap.Modal.getInstance(document.getElementById('traitOfferModal'));
      modal.hide();
      
      // Reload offers tab if active
      if (document.querySelector('.nav-link.active').id === 'offers-tab') {
        loadUserOffers();
      }
    } else {
      showNotification('Error al crear oferta por rasgo: ' + result.error, 'error');
    }
  } catch (error) {
    console.error('Error al crear oferta por rasgo:', error);
    showNotification('Error al crear oferta: ' + error.message, 'error');
  }
}

// Create floor offer from form
async function createFloorOfferFromForm() {
  if (!marketContract || !tokenContract || !signer) {
    showNotification('Por favor conecta tu wallet primero', 'error');
    return;
  }
  
  const collection = document.getElementById('collection-address').value;
  const offerAmount = document.getElementById('floor-offer-amount').value;
  
  if (!collection || !ethers.utils.isAddress(collection)) {
    showNotification('Por favor ingresa una dirección de colección válida', 'error');
    return;
  }
  
  if (!offerAmount || parseFloat(offerAmount) <= 0) {
    showNotification('Por favor ingresa una cantidad de oferta válida', 'error');
    return;
  }
  
  try {
    // Create floor offer
    const result = await createFloorOffer(
      marketContract,
      tokenContract,
      collection,
      offerAmount,
      signer
    );
    
    if (result.success) {
      showNotification('¡Oferta de piso creada exitosamente!', 'success');
      
      // Clear form and close modal
      document.getElementById('collection-address').value = '';
      document.getElementById('floor-offer-amount').value = '';
      const modal = bootstrap.Modal.getInstance(document.getElementById('floorOfferModal'));
      modal.hide();
      
      // Reload offers tab if active
      if (document.querySelector('.nav-link.active').id === 'offers-tab') {
        loadUserOffers();
      }
    } else {
      showNotification('Error al crear oferta de piso: ' + result.error, 'error');
    }
  } catch (error) {
    console.error('Error al crear oferta de piso:', error);
    showNotification('Error al crear oferta: ' + error.message, 'error');
  }
}

// Handle trait type selection change
function handleTraitTypeChange() {
  const traitTypeSelect = document.getElementById('trait-type-select');
  const traitValueSelect = document.getElementById('trait-value-select');
  
  const selectedType = traitTypeSelect.value;
  
  // Reset and disable value select
  traitValueSelect.innerHTML = '<option value="">Selecciona un valor</option>';
  traitValueSelect.disabled = !selectedType;
  
  if (!selectedType) return;
  
  // Get all attributes from loaded NFTs
  const traits = {};
  
  userNFTs.forEach(nft => {
    if (nft.attributes && nft.attributes.length > 0) {
      nft.attributes.forEach(attr => {
        if (attr.trait_type === selectedType && attr.value) {
          traits[attr.value] = true;
        }
      });
    }
  });
  
  // Add trait values to select
  Object.keys(traits).sort().forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    traitValueSelect.appendChild(option);
  });
}

// Load user offers (token, floor, trait)
async function loadUserOffers() {
  if (!currentAccount || !marketContract) return;
  
  loadUserTokenOffers();
  loadUserFloorOffers();
  loadUserTraitOffers();
}

// Load user token offers
async function loadUserTokenOffers() {
  const loadingElement = document.getElementById('loading-token-offers');
  const noOffersMessage = document.getElementById('no-token-offers');
  const offersList = document.getElementById('token-offers-list');
  
  loadingElement.style.display = 'block';
  noOffersMessage.style.display = 'none';
  offersList.style.display = 'none';
  
  try {
    // Get all token offers
    const offers = await marketContract.getMyTokenOffers(currentAccount);
    
    // Filter active offers
    const activeOffers = offers.filter(offer => offer.exists);
    
    if (activeOffers.length === 0) {
      loadingElement.style.display = 'none';
      noOffersMessage.style.display = 'block';
      return;
    }
    
    // Clear previous offers
    offersList.innerHTML = '';
    
    // Process and display offers
    for (const offer of activeOffers) {
      try {
        // Get NFT metadata
        const nftMetadata = await getNFTMetadata(
          ALCHEMY_API_KEY,
          offer.collection,
          offer.tokenId.toString()
        );
        
        // Create offer item
        const offerItem = document.createElement('div');
        offerItem.className = 'list-group-item offer-item';
        
        const offerAmount = ethers.utils.formatEther(offer.offerAmount);
        
        offerItem.innerHTML = `
          <div class="d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center">
              <img src="${nftMetadata.image}" alt="${nftMetadata.title}" class="me-3" 
                 style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"
                 onerror="this.src='https://placehold.co/50x50?text=NFT'">
              <div>
                <h6 class="mb-1">${nftMetadata.title}</h6>
                <div class="offer-info">Token ID: ${offer.tokenId.toString()}</div>
                <div class="offer-amount">${offerAmount} $ADRIAN</div>
              </div>
            </div>
            <button class="btn btn-sm btn-danger cancel-token-offer-btn" 
                    data-collection="${offer.collection}" 
                    data-token-id="${offer.tokenId}">
              Cancelar
            </button>
          </div>
        `;
        
        offersList.appendChild(offerItem);
      } catch (error) {
        console.error(`Error procesando oferta de token:`, error);
      }
    }
    
    // Add event listeners
    document.querySelectorAll('.cancel-token-offer-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const collection = btn.getAttribute('data-collection');
        const tokenId = btn.getAttribute('data-token-id');
        
        const result = await cancelTokenOffer(marketContract, collection, tokenId);
        
        if (result.success) {
          showNotification('Oferta cancelada exitosamente', 'success');
          loadUserTokenOffers();
        } else {
          showNotification('Error al cancelar oferta: ' + result.error, 'error');
        }
      });
    });
    
    loadingElement.style.display = 'none';
    offersList.style.display = 'block';
  } catch (error) {
    console.error('Error cargando ofertas de token:', error);
    loadingElement.style.display = 'none';
    noOffersMessage.style.display = 'block';
    showNotification('Error al cargar ofertas de token', 'error');
  }
}

// Load user floor offers
async function loadUserFloorOffers() {
  // This is more complex as the contract doesn't have a direct way to get all floor offers
  // We would need to use events or track collections where user has placed floor offers
}

// Load user trait offers
async function loadUserTraitOffers() {
  // Similar to floor offers, this requires event filtering
  // Simplified implementation would need event logs or a dedicated backend
} 