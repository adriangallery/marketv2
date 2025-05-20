// Offers management for AdrianMarket
// Functions for working with Floor, Token and Trait offers

// Create a floor offer for a collection
async function createFloorOffer(marketContract, tokenContract, collection, offerAmount, signer) {
  try {
    // Convert offer amount to wei
    const offerAmountWei = ethers.utils.parseEther(offerAmount.toString());
    
    // Get signer address
    const userAddress = await signer.getAddress();
    
    // Approve tokens for the marketplace if needed
    const allowance = await tokenContract.allowance(userAddress, marketContract.address);
    
    if (allowance.lt(offerAmountWei)) {
      console.log("Approving tokens for floor offer...");
      const tx = await tokenContract.approve(marketContract.address, offerAmountWei);
      await tx.wait();
    }
    
    // Create the floor offer
    console.log("Creating floor offer...");
    const tx = await marketContract.setFloorOffer(collection, offerAmountWei, { gasLimit: 500000 });
    const receipt = await tx.wait();
    
    return {
      success: true,
      transaction: receipt
    };
  } catch (error) {
    console.error("Error creating floor offer:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Cancel a floor offer
async function cancelFloorOffer(marketContract, collection) {
  try {
    // Setting offer amount to 0 cancels the floor offer
    console.log("Cancelling floor offer...");
    const tx = await marketContract.setFloorOffer(collection, 0, { gasLimit: 500000 });
    const receipt = await tx.wait();
    
    return {
      success: true,
      transaction: receipt
    };
  } catch (error) {
    console.error("Error cancelling floor offer:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Get floor offer for a collection
async function getFloorOffer(marketContract, collection) {
  try {
    // The floor offers mapping returns a struct with active, buyer, and offerAmount
    const floorOffer = await marketContract.floorOffers(collection, 0);
    
    if (floorOffer.active) {
      return {
        exists: true,
        amount: ethers.utils.formatEther(floorOffer.offerAmount),
        buyer: floorOffer.buyer,
        active: floorOffer.active
      };
    } else {
      return {
        exists: false,
        amount: "0",
        buyer: ethers.constants.AddressZero,
        active: false
      };
    }
  } catch (error) {
    console.error("Error fetching floor offer:", error);
    return {
      exists: false,
      error: error.message
    };
  }
}

// Create a token offer
async function createTokenOffer(marketContract, tokenContract, collection, tokenId, quantity, offerAmount, signer) {
  try {
    // Convert offer amount to wei
    const offerAmountWei = ethers.utils.parseEther(offerAmount.toString());
    
    // Get signer address
    const userAddress = await signer.getAddress();
    
    // Approve tokens for the marketplace if needed
    const allowance = await tokenContract.allowance(userAddress, marketContract.address);
    
    if (allowance.lt(offerAmountWei)) {
      console.log("Approving tokens for token offer...");
      const tx = await tokenContract.approve(marketContract.address, offerAmountWei);
      await tx.wait();
    }
    
    // Create the token offer
    console.log("Creating token offer...");
    const tx = await marketContract.makeTokenOffer(collection, tokenId, quantity, offerAmountWei, { gasLimit: 500000 });
    const receipt = await tx.wait();
    
    return {
      success: true,
      transaction: receipt
    };
  } catch (error) {
    console.error("Error creating token offer:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Cancel a token offer
async function cancelTokenOffer(marketContract, collection, tokenId) {
  try {
    console.log("Cancelling token offer...");
    const tx = await marketContract.withdrawTokenOffer(collection, tokenId, { gasLimit: 500000 });
    const receipt = await tx.wait();
    
    return {
      success: true,
      transaction: receipt
    };
  } catch (error) {
    console.error("Error cancelling token offer:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Create a trait offer
async function createTraitOffer(marketContract, tokenContract, traitType, traitValue, offerAmount, signer) {
  try {
    // Convert offer amount to wei
    const offerAmountWei = ethers.utils.parseEther(offerAmount.toString());
    
    // Get signer address
    const userAddress = await signer.getAddress();
    
    // Approve tokens for the marketplace if needed
    const allowance = await tokenContract.allowance(userAddress, marketContract.address);
    
    if (allowance.lt(offerAmountWei)) {
      console.log("Approving tokens for trait offer...");
      const tx = await tokenContract.approve(marketContract.address, offerAmountWei);
      await tx.wait();
    }
    
    // Create the trait offer
    console.log("Creating trait offer...");
    const tx = await marketContract.setTraitOffer(traitType, traitValue, offerAmountWei, { gasLimit: 500000 });
    const receipt = await tx.wait();
    
    return {
      success: true,
      transaction: receipt
    };
  } catch (error) {
    console.error("Error creating trait offer:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Cancel a trait offer
async function cancelTraitOffer(marketContract, traitType, traitValue) {
  try {
    console.log("Cancelling trait offer...");
    const tx = await marketContract.cancelTraitOffer(traitType, traitValue, { gasLimit: 500000 });
    const receipt = await tx.wait();
    
    return {
      success: true,
      transaction: receipt
    };
  } catch (error) {
    console.error("Error cancelling trait offer:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Accept a floor offer
async function acceptFloorOffer(marketContract, nftContract, tokenId, nftType, signer) {
  try {
    // Check if NFT is approved for marketplace
    const userAddress = await signer.getAddress();
    const isApproved = await nftContract.isApprovedForAll(userAddress, marketContract.address);
    const approvedAddress = await nftContract.getApproved(tokenId);
    
    if (!isApproved && approvedAddress.toLowerCase() !== marketContract.address.toLowerCase()) {
      // Approve NFT for marketplace
      console.log("Approving NFT for marketplace...");
      const tx = await nftContract.approve(marketContract.address, tokenId);
      await tx.wait();
    }
    
    // Accept the floor offer
    console.log("Accepting floor offer...");
    const tx = await marketContract.acceptFloorOffer(
      nftContract.address,
      tokenId,
      nftType, // NFT type (1 = ERC721)
      { gasLimit: 1000000 }
    );
    const receipt = await tx.wait();
    
    return {
      success: true,
      transaction: receipt
    };
  } catch (error) {
    console.error("Error accepting floor offer:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Accept a token offer
async function acceptTokenOffer(marketContract, nftContract, tokenId, offerId, nftType, signer) {
  try {
    // Check if NFT is approved for marketplace
    const userAddress = await signer.getAddress();
    const isApproved = await nftContract.isApprovedForAll(userAddress, marketContract.address);
    const approvedAddress = await nftContract.getApproved(tokenId);
    
    if (!isApproved && approvedAddress.toLowerCase() !== marketContract.address.toLowerCase()) {
      // Approve NFT for marketplace
      console.log("Approving NFT for marketplace...");
      const tx = await nftContract.approve(marketContract.address, tokenId);
      await tx.wait();
    }
    
    // Accept the token offer
    console.log("Accepting token offer...");
    const tx = await marketContract.acceptTokenOffer(
      nftContract.address,
      tokenId,
      offerId,
      nftType, // NFT type (1 = ERC721)
      { gasLimit: 1000000 }
    );
    const receipt = await tx.wait();
    
    return {
      success: true,
      transaction: receipt
    };
  } catch (error) {
    console.error("Error accepting token offer:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Accept a trait offer
async function acceptTraitOffer(marketContract, nftContract, tokenId, traitType, traitValue, nftType, signer) {
  try {
    // Check if NFT is approved for marketplace
    const userAddress = await signer.getAddress();
    const isApproved = await nftContract.isApprovedForAll(userAddress, marketContract.address);
    const approvedAddress = await nftContract.getApproved(tokenId);
    
    if (!isApproved && approvedAddress.toLowerCase() !== marketContract.address.toLowerCase()) {
      // Approve NFT for marketplace
      console.log("Approving NFT for marketplace...");
      const tx = await nftContract.approve(marketContract.address, tokenId);
      await tx.wait();
    }
    
    // Accept the trait offer
    console.log("Accepting trait offer...");
    const tx = await marketContract.acceptTraitOffer(
      traitType,
      traitValue,
      tokenId,
      nftContract.address,
      nftType, // NFT type (1 = ERC721)
      { gasLimit: 1000000 }
    );
    const receipt = await tx.wait();
    
    return {
      success: true,
      transaction: receipt
    };
  } catch (error) {
    console.error("Error accepting trait offer:", error);
    return {
      success: false,
      error: error.message
    };
  }
} 