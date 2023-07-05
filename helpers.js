export async function getItemsForSale(sdkInstance, account) {
    const { items, metadataArrModified } = await sdkInstance.loadItems();

    const itemsWithMetadata = items.map((item, index) => {
        return {
            ...item,
            ...metadataArrModified[index],
        };
    });

    const filteredItems = itemsWithMetadata.filter((item) => item.price.toString() != "0" && item.owner !== account).map(item => {
        return {
            id: item.id,
            name: item.data.name,
            description: item.data.description,
            price: item.price,
            owner: item.owner,
        }
    });

    return filteredItems;
}

export async function getItemsForOfferring(sdkInstance, account) {
    const { items, metadataArrModified } = await sdkInstance.loadItems();

    const itemsWithMetadata = items.map((item, index) => {
        return {
            ...item,
            ...metadataArrModified[index],
        };
    });

    const filteredItems = itemsWithMetadata.filter((item) => item.price.toString() == "0" && item.owner != account).map(item => {
        return {
            id: item.id,
            name: item.data.name,
            description: item.data.description,
            nft: item.nft,
            tokenId: item.tokenId,
            owner: item.owner,
        }
    });

    return filteredItems;
}

export async function getOffers(sdkInstance, account) {
    const { items } = await sdkInstance.loadItems();

    const filteredItems = items.filter((item) => item.owner == account && item.price.toString() == "0");

    const ids = filteredItems.map((item) => item.id.toNumber());

    const idArr = Array.from(ids);

    const offerPromises = idArr.map((id) => sdkInstance.getOffers(id));

    const offers = await Promise.all(offerPromises);

    offers.forEach((offer, index) => {
        offer.forEach((o) => {
            o.itemId = idArr[index];
        });
    });

    const offersFiltered = offers.filter((offer) => offer.length > 0).flat().filter((offer) => offer.seller === account && offer.isAccepted == false);

    return offersFiltered;
}

export async function getItemsForListing(sdkInstance, account) {
    const { filteredItems: items, nfts } = await sdkInstance.loadItemsForListing(account);

    const combinedItems = items.map((item) => {
        const nft = nfts.find((nft) => nft.tokenId == item.tokenId);
        return {
            ...item,
            name: nft.name,
            description: nft.description,
            image: nft.image,
        };
    });

    return combinedItems;
}

export async function getAccountsItems(sdkInstance, account) {
    const { items, metadataArrModified } = await sdkInstance.loadItems();

    const combinedItems = items.map((item) => {
        const metadata = metadataArrModified
            .find((metadata) => metadata.tokenId == item.tokenId && metadata.nft == item.nftContract)
        return {
            ...item,
            name: metadata.name,
            description: metadata.description,
            image: metadata.image,
        };
    });

    const filtered = combinedItems.filter((item) => item.owner == account);

    return filtered;
}