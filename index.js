#!/usr/bin/env node

import chalk from "chalk";
import inquirer from "inquirer";
import gradient from "gradient-string";
import chalkAnimation from "chalk-animation";
import figlet from "figlet";
import { createSpinner } from "nanospinner";
import { ethers } from "ethers";
import NFTMarketplaceSDK from "nft-mp-sdk";
import fs from "fs";

import nftMarketplaceABI from "./contractData/abi/NFTMarketplace.json" assert { type: "json" };
import nftABI from "./contractData/abi/NFT.json" assert { type: "json" };
import nftBytecode from "./contractData/NftBytecode.json" assert { type: "json" };

let contractAddress;
let privateKey;
let account;

let projectId;
let projectSecret;

let sdkInstance;

const spleep = (ms = 2000) => new Promise((resolve) => setTimeout(resolve, ms));

async function welcome() {
    const rainbow = chalkAnimation.karaoke("Welcome to the NFT-Marketplace CLI");

    await spleep(2000);
    rainbow.stop();
}

await welcome();

async function provideContractAddress() {
    const { contract } = await inquirer.prompt([
        {
            type: "input",
            name: "contract",
            message: "Enter your contract address:",
            default: "0x705279FAE070DEe258156940d88A6eCF5B302073",
        },
    ]);

    if (!ethers.utils.isAddress(contract)) {
        console.log(chalk.bgRed("Invalid contract address"));        
        await provideContractAddress();
        return;
    }

    contractAddress = contract;
}

await provideContractAddress();

async function providerPrivateKey() {
    const { privateKey: key } = await inquirer.prompt([
        {
            type: "input",
            name: "privateKey",
            message: "Enter your private key:",
        },
    ]);

    privateKey = key.trim();

    handleInputContract();
}

await providerPrivateKey();

async function providePrivateKeyRequired() {
    const { privateKey: key } = await inquirer.prompt([
        {
            type: "input",
            name: "privateKey",
            message: "Enter your private key:",
        },
    ]);

    if (!verify(key)) {
        console.log(chalk.bgRed("Invalid private key"));
        await providePrivateKeyRequired();
        return;
    }

    privateKey = key.trim();

    handleInputContract();
}

function handleInputContract() {
    let provider = new ethers.providers.InfuraProvider("sepolia", "09755767452a49d3a5b3f9b84d9db6c9");

    if (verify(privateKey)) {
        const wallet = new ethers.Wallet(privateKey);

        provider = wallet.connect(provider);

        account = wallet.address;
    }

    const sdk = new NFTMarketplaceSDK(provider, contractAddress, nftMarketplaceABI, nftABI, nftBytecode.bytecode, 'https://charity-file-storage.infura-ipfs.io/ipfs/');

    sdkInstance = sdk;
}

function verify(value) {
    try {
        new ethers.Wallet(value);
    } catch (e) { return false; }
    return true;
}

async function showItems() {
    const spinner = createSpinner("Loading items...");
    spinner.start();

    const { items, metadataArrModified } = await sdkInstance.loadItems();
    spinner.stop();

    const combindedItems = items.map((item, index) => {
        return {
            ...item,
            ...metadataArrModified[index],
        };
    });

    combindedItems.forEach((item) => {
        console.log(`
        ${chalk.bold("ID:")} ${item.id.toString()}
        ${chalk.bold("Name:")} ${item.name}
        ${chalk.bold("Description:")} ${item.description}
        ${chalk.bold("Image:")} ${item.image}
        ${chalk.bold("Token ID:")} ${item.tokenId.toString()}
        ${chalk.bold("Owner:")} ${item.owner}
        ${chalk.bold("Price:")} ${ethers.utils.formatEther(item.price)} ETH
        `)
    });
}

async function showItem() {
    const { id } = await inquirer.prompt([
        {
            type: "input",
            name: "id",
            message: "Enter the token ID of the item you want to see:",
        },
    ]);

    const spinner = createSpinner("Loading item...");
    spinner.start();


    const { item, metadata } = await sdkInstance.getItem(id);

    const combindedItem = {
        ...item,
        ...metadata,
    };

    console.log(`
        ${chalk.bold("ID:")} ${combindedItem.id.toString()}
        ${chalk.bold("Name:")} ${combindedItem.data.name}
        ${chalk.bold("Description:")} ${combindedItem.data.description}
        ${chalk.bold("Image:")} ${combindedItem.data.image}
        ${chalk.bold("Token ID:")} ${combindedItem.tokenId.toString()}
        ${chalk.bold("Owner:")} ${combindedItem.owner}
        ${chalk.bold("Price:")} ${ethers.utils.formatEther(combindedItem.price)} ETH
        `)

    spinner.stop();
}

async function buyItem() {

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

    if (filteredItems.length == 0) {
        console.log(chalk.bgRed("There are no items to buy"));
        return;
    }

    const choices = filteredItems.map((item) => {
        return {
            name: `${item.name} - ${item.description} - ${ethers.utils.formatEther(item.price)} ETH`,
            value: item.id,
        };
    });

    const { id } = await inquirer.prompt([
        {
            type: "list",
            name: "id",
            message: "Select the item you want to buy:",
            choices: choices,
        },
    ]);

    const spinner = createSpinner("Buying item...");
    spinner.start();

    const item = filteredItems.find((item) => item.id == id);

    const owner = item.owner;

    if (owner == account) {
        spinner.stop();
        console.log(chalk.bgRed("You can't buy an item you own!"));
        return;
    }

    const result = await sdkInstance.buyItem(id, item.price);

    spinner.stop();

    if (result == 1) {
        console.log(chalk.bgCyan("Item bought successfully!"));
    }
    else {
        console.log(chalk.bgRed("Something went wrong!"));
    }
}

async function makeOffer() {

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

    const choices = filteredItems.map((item) => {
        return {
            name: `ID: ${item.id} - ${item.name} - ${item.description.slice(0, 50)} - nft: ${item.nft} - token ID: ${item.tokenId}`,
            value: item.id,
        };
    });

    const { id } = await inquirer.prompt([
        {
            type: "list",
            name: "id",
            message: "Select the item you want to make an offer for:",
            choices: choices,
        },
    ]);

    const { offer } = await inquirer.prompt([
        {
            type: "input",
            name: "offer",
            message: "Enter the amount of ETH you want to offer:",
        },
    ]);

    const spinner = createSpinner("Making offer...");

    spinner.start();

    const parseToWei = ethers.utils.parseEther(offer);

    const result = await sdkInstance.placeOffer(id, parseToWei);

    spinner.stop();

    if (result == 1) {
        console.log(chalk.bgCyan("Offer made successfully!"));
    }
    else {
        console.log(chalk.bgRed("Something went wrong!"));
    }
}

async function MyOffers() {
    const offers = await sdkInstance.getAccountsOffers(account);

    const choices = offers.map((offer) => {
        return {
            name: `ID: ${offer.itemId} - ${offer.nftContract} - Token ID: ${offer.tokenId.toString()} - ${ethers.utils.formatEther(offer.price)} ETH | ${offer.isAccepted ? chalk.green("Accepted") : chalk.red("Not accepted")}`,
            value: offer.itemId,
            isAccepted: offer.isAccepted,
            price: offer.price,
        };
    });

    choices.forEach((choice) => {
        console.log(choice.name);
    });

    const isAccepted = choices.some((choice) => choice.isAccepted);

    if (!isAccepted) {
        console.log(chalk.bgRed("You don't have any accepted offers!"));
        return;
    }

    const { answer } = await inquirer.prompt([
        {
            type: "list",
            name: "answer",
            message: "Do you want to claim an item?",
            choices: ["Yes", "No"],
        },
    ]);

    if (answer == "Yes") {
        const offers = choices.filter((choice) => choice.isAccepted);

        const { id } = await inquirer.prompt([
            {
                type: "list",
                name: "id",
                message: "Select the item you want to claim:",
                choices: offers,
            },
        ]);

        const spinner = createSpinner("Claiming item...");
        spinner.start();

        const claim = await sdkInstance.claimItem(id, offers.find((offer) => offer.value == id).price);

        if (claim == 1) {
            spinner.stop();
            console.log(chalk.bgCyan("Item claimed successfully!"));
        }
        else {
            console.log(chalk.bgRed("Something went wrong!"));
        }
    }
}

async function acceptOffer() {
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

    if (offersFiltered.length == 0) {
        console.log(chalk.bgRed("You don't have any offers to accept!"));
        return;
    }

    const choices = offersFiltered.map((offer) => {
        return {
            name: `ID: ${offer.itemId} - From: ${offer.offerer} - ${ethers.utils.formatEther(offer.price)} ETH`,
            value: { id: offer.itemId, offerer: offer.offerer },
            price: offer.price,
            nftContract: offer.nftContract,
            tokenId: offer.tokenId,
        };
    });

    const { data } = await inquirer.prompt([
        {
            type: "list",
            name: "data",
            message: "Select the item you want to accept an offer for:",
            choices: choices,
        },
    ]);

    const spinner = createSpinner("Accepting offer...");
    spinner.start();

    const accept = await sdkInstance.acceptOffer(data.id, data.offerer);

    if (accept == 1) {
        spinner.stop();
        console.log(chalk.bgCyan("Offer accepted successfully!"));
    }
    else {
        console.log(chalk.bgRed("Something went wrong!"));
    }
}

async function loadCollections() {
    const collections = await sdkInstance.loadCollections();

    const ownersPromises = collections.map((collection) => {
        const contract = new ethers.Contract(collection.address, sdkInstance.nftABI, sdkInstance.signerOrProvider);
        return contract.owner();
    });

    const owners = await Promise.all(ownersPromises);

    const filteredCollections = collections.filter((collection, index) => owners[index] == account);

    const choices = filteredCollections.map((collection) => {
        return {
            name: `${collection.name} - ${collection.symbol} - ${collection.address}`,
            value: collection.address,
        };
    });

    return choices;
}

async function provideIdSecter() {
    if (!projectId || !projectSecret) {
        console.log(chalk.bgRed("Please provide a project ID and project secret!"));

        const { id } = await inquirer.prompt([
            {
                type: "input",
                name: "id",
                message: "Enter your project ID:",
            },
        ]);

        const { secret } = await inquirer.prompt([
            {
                type: "input",
                name: "secret",
                message: "Enter your project secret:",
            },
        ]);

        projectId = id;
        projectSecret = secret;
    }
}

async function mintItem() {

    await provideIdSecter();

    const collections = await loadCollections();

    if (collections.length == 0) {
        console.log(chalk.bgRed("You don't own any collections!"));
        return;
    }

    const { collection } = await inquirer.prompt([
        {
            type: "list",
            name: "collection",
            message: "Select the collection you want to mint an item from:",
            choices: collections,
        },
    ]);

    const { name } = await inquirer.prompt([
        {
            type: "input",
            name: "name",
            message: "Enter the name of the item:",
        },
    ]);

    const { description } = await inquirer.prompt([
        {
            type: "input",
            name: "description",
            message: "Enter the description of the item:",
        },
    ]);

    const { image } = await inquirer.prompt([
        {
            type: "input",
            name: "image",
            message: "Enter the path of the image of the item:",
            default: "C:\\Users\\DanielDimitrov\\OneDrive - INENSIA\\Desktop\\mem.png",
        },
    ]);

    const img = fs.readFileSync(image);

    const spinner = createSpinner("Minting item...");
    spinner.start();

    const metadata = {
        name: name,
        description: description,
        image: img,
    }

    const mintClient = await sdkInstance.infuraIpfsClient(projectId, projectSecret);

    const result = await mintClient.mintNFT(collection, metadata);

    if (result == 1) {
        spinner.stop();
        console.log(chalk.bgCyan("Item minted successfully!"));
    }
    else {
        console.log(chalk.bgRed("Something went wrong!"));
    }
}

async function addItemsToMarketplace() {
    const collections = await loadCollections();

    if (collections.length == 0) {
        console.log(chalk.bgRed("You don't own any collections!"));
        return;
    }

    const { collection } = await inquirer.prompt([
        {
            type: "list",
            name: "collection",
            message: "Select the collection you want to add an item from:",
            choices: collections,
        },
    ]);

    const itemsForAdding = await sdkInstance.loadItemsForAdding(collection, account);

    if (itemsForAdding.length == 0) {
        console.log(chalk.bgRed("You don't own any items that are not in the marketplace!"));
        return;
    }

    const choices = itemsForAdding.map((item) => {
        return {
            name: `ID: ${item.tokenId.toString()} - ${item.name} - ${item.description} | ${item.image}`,
            value: item.tokenId,
        };
    });

    const { id } = await inquirer.prompt([
        {
            type: "list",
            name: "id",
            message: "Select the item you want to add to the marketplace:",
            choices: choices,
        },
    ]);

    const spinner = createSpinner("Adding item to marketplace...");
    spinner.start();

    const result = await sdkInstance.addItemToMarketplace(collection, id);

    if (result == 1) {
        spinner.stop();
        console.log(chalk.bgCyan("Item added to marketplace successfully!"));
    }
    else {
        console.log(chalk.bgRed("Something went wrong!"));
    }
}

async function listItem() {
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

    if (items.length == 0) {
        console.log(chalk.bgRed("You don't own any items that are not listed!"));
        return;
    }

    const choices = combinedItems.map((item) => {
        return {
            name: `ID: ${item.tokenId.toString()} - ${item.name} - ${item.description} | ${item.image}`,
            value: { id: item.tokenId, nft: item.nftContract },
        };
    });

    const { data } = await inquirer.prompt([
        {
            type: "list",
            name: "data",
            message: "Select the item you want to list:",
            choices: choices,
        },
    ]);

    const { price } = await inquirer.prompt([
        {
            type: "input",
            name: "price",
            message: "Enter the price(ETH) of the item:",
        },
    ]);

    const spinner = createSpinner("Listing item...");
    spinner.start();

    const result = await sdkInstance.listItemForSale(data.nft, data.id, ethers.utils.parseEther(price));

    if (result == 1) {
        spinner.stop();
        console.log(chalk.bgCyan("Item listed successfully!"));
    }
    else {
        console.log(chalk.bgRed("Something went wrong!"));
    }

    spinner.stop();
}

async function askForOption() {
    const { option } = await inquirer.prompt([
        {
            type: "list",
            name: "option",
            message: "What do you want to do?",
            choices: ["Show all items", "Show item", "Buy item", "Mint item", "Add item to marketplace", "List item", "Make offer", "My offers", "Accept offer", "Exit"],
        },
    ]);

    if (option !== "Exit" && option !== "Show all items" && option !== "Show item") {
        if (!account) {
            console.log(chalk.bgRed("You must provide private key!"));
            await providePrivateKeyRequired();

            handleInputContract();
        }
    }

    if (option === "Show all items") {
        await showItems();
    } else if (option === "Show item") {
        await showItem();
    }
    else if (option === "Buy item") {
        await buyItem();
    }
    else if (option === "Mint item") {
        await mintItem();
    }
    else if (option === "Add item to marketplace") {
        await addItemsToMarketplace();
    }
    else if (option === "List item") {
        await listItem();
    }
    else if (option === "Make offer") {
        await makeOffer();
    }
    else if (option === "My offers") {
        await MyOffers();
    }
    else if (option === "Accept offer") {
        await acceptOffer();
    }
    else if (option === "Exit") {
        console.clear();
        process.exit();
    }

    await askForOption();
}

await askForOption();

