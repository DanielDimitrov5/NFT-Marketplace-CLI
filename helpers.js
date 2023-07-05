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