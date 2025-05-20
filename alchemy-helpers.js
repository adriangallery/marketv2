// Alchemy Helpers for AdrianMarket
// Functions for working with Alchemy NFT API

// Extract NFT image URL from Alchemy response
function extractNFTImageUrl(nft) {
  // Try multiple paths to find the image
  if (nft.media && nft.media.length > 0) {
    // Try the gateway URL first (already processed by Alchemy)
    if (nft.media[0].gateway) return nft.media[0].gateway;
    // Fall back to raw URL 
    if (nft.media[0].raw) return nft.media[0].raw;
  }
  
  // Check the metadata object
  if (nft.metadata && nft.metadata.image) {
    const imageUrl = nft.metadata.image;
    
    // Handle IPFS URLs
    if (imageUrl.startsWith('ipfs://')) {
      const ipfsHash = imageUrl.replace('ipfs://', '');
      // Check if the hash already contains 'ipfs/' prefix to avoid duplication
      if (ipfsHash.startsWith('ipfs/')) {
        return `https://ipfs.io/${ipfsHash}`;
      } else {
        return `https://ipfs.io/ipfs/${ipfsHash}`;
      }
    }
    
    // Handle Arweave URLs
    if (imageUrl.startsWith('ar://')) {
      return imageUrl.replace('ar://', 'https://arweave.net/');
    }
    
    return imageUrl;
  }
  
  // Return placeholder if nothing found
  return 'https://placehold.co/400x400?text=NFT+Image';
}

// Get NFTs owned by a specific address
async function getNFTsForOwner(apiKey, ownerAddress, pageKey = null, pageSize = 20) {
  try {
    // Construct the API URL with pagination
    let alchemyUrl = `https://base-mainnet.g.alchemy.com/nft/v3/${apiKey}/getNFTsForOwner?owner=${ownerAddress}&withMetadata=true&pageSize=${pageSize}&tokenType=ERC721`;
    if (pageKey) {
      alchemyUrl += `&pageKey=${encodeURIComponent(pageKey)}`;
    }
    
    const response = await fetch(alchemyUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch NFTs from Alchemy API');
    }
    
    const data = await response.json();
    
    // Process NFTs
    if (data.ownedNfts && data.ownedNfts.length > 0) {
      const processedNFTs = data.ownedNfts.map(nft => {
        // Extract image URL
        const imageUrl = extractNFTImageUrl(nft);
        
        return {
          contract: nft.contract.address,
          tokenId: parseInt(nft.tokenId, 16) || nft.tokenId,
          title: nft.title || `NFT #${nft.tokenId}`,
          description: nft.description || '',
          image: imageUrl,
          metadata: nft.metadata || {},
          attributes: nft.metadata?.attributes || []
        };
      });
      
      return {
        nfts: processedNFTs,
        pageKey: data.pageKey
      };
    } else {
      return {
        nfts: [],
        pageKey: null
      };
    }
  } catch (error) {
    console.error('Error loading NFTs:', error);
    throw error;
  }
}

// Get metadata for a specific NFT
async function getNFTMetadata(apiKey, contractAddress, tokenId) {
  try {
    const url = `https://base-mainnet.g.alchemy.com/nft/v3/${apiKey}/getNFTMetadata?contractAddress=${contractAddress}&tokenId=${tokenId}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch NFT metadata from Alchemy API');
    }
    
    const data = await response.json();
    
    // Extract image URL
    const imageUrl = extractNFTImageUrl(data);
    
    return {
      title: data.title || `NFT #${tokenId}`,
      description: data.description || '',
      image: imageUrl,
      metadata: data.metadata || {},
      attributes: data.metadata?.attributes || []
    };
  } catch (error) {
    console.error('Error loading NFT metadata:', error);
    return {
      title: `NFT #${tokenId}`,
      description: '',
      image: 'https://placehold.co/400x400?text=NFT+Image',
      metadata: {},
      attributes: []
    };
  }
}

// Format time remaining
function formatTimeRemaining(expirationTime) {
  const expirationDate = new Date(expirationTime * 1000);
  const now = new Date();
  const timeRemaining = expirationDate - now;
  
  // Format time remaining
  let timeString = 'Expired';
  if (timeRemaining > 0) {
    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      timeString = `${days}d ${hours}h left`;
    } else {
      const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
      timeString = `${hours}h ${minutes}m left`;
    }
  }
  
  return timeString;
} 