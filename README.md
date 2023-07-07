# NFT Marketplace CLI

This command-line interface (CLI) tool is designed to interact with an NFT Marketplace contract using the NFTMarketplaceSDK. The CLI allows you to perform various operations such as listing items, buying items, and minting NFTs.

## Prerequisite
To use this CLI tool, ensure you have Node.js v17.5.0 or greater installed on your machine

## Global Installation (through npm package)

You can use the CLI tool without installing it locally by using npx.

`npx nft-marketplace-cli`

This command uses npx to run the CLI tool directly from the npm package registry.

## Local Installation

Alternatively you can install it locally. Cone this repository or download the source code. Navigate to the directory and run: 

`npm install`

This will install all the necessary dependencies required for the CLI tool to function properly.

## Usage

To start the CLI, navigate to the directory containing the CLI code and run:

`node index.js` (local installation)

or

`npx nft-marketplace-cli`

This will initiate the CLI, and you will be prompted to choose an option from the list. The CLI provides several options for interacting with the NFT marketplace:

## Options:

### Show all items
Lists all the items available in the NFT marketplace.

### Show item
Allows you to view a single item by its ID.

### My items
Lists all the items that belong to you.

### Account's items
Lists all the items that belong to a specific account. You will need to enter the account address.

### Show collections
Displays all the collections available in the NFT marketplace.

### Buy item
Displays a list of items available for sale. After you select an item, it will be purchased if you are not the owner of the item.

### Mint item
Enables you to mint a new item in the marketplace.

### Add item to marketplace
Adds an item to the marketplace from one of your collections. Users need to select a collection and then an item from that collection to add.

### List item
Enables you to list an item for sale in the marketplace.

### Make offer
Allows you to make an offer on an item. Displays a list of items for which offers can be made. You need to select an item and enter the amount you want to offer in ETH.

### My offers
View all the offers you have made.

### Accept offer
Accept an offer made for one of your items.

### Create NFT Collection
Create a new NFT collection.

### Get marketplace balance
View the current balance of the marketplace.

### Withdraw money (Marketplace Owner only)
As the marketplace owner, this option allows you to withdraw funds from the marketplace contract.

### Exit
Exit the CLI tool.

Once you select an option, you may need to enter additional information depending on the operation. Follow the prompts to perform the desired actions.

## CLI Screenshot

*Insert screenshot here*

## Contributing

Contributions are welcome! Feel free to open a pull request or raise an issue if you find any bugs or have suggestions for improvements.

## License

This project is licensed under the MIT License.
