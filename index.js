#!/usr/bin/env node

import chalk from "chalk";
import inquirer from "inquirer";
import gradient from "gradient-string";
import chalkAnimation from "chalk-animation";
import figlet from "figlet";
import { createSpinner } from "nanospinner";
import { ethers } from "ethers";
import NFTMarketplaceSDK from "nft-mp-sdk";

import nftMarketplaceABI from "./contractData/abi/NFTMarketplace.json" assert { type: "json" };
import nftABI from "./contractData/abi/NFT.json" assert { type: "json" };
import nftBytecode from "./contractData/NftBytecode.json" assert { type: "json" };

let contractAddress;
let sdkInstance;
let privateKey;

const spleep = (ms = 2000) => new Promise((resolve) => setTimeout(resolve, ms));

async function welcome() {
    const rainbow = chalkAnimation.karaoke("Welcome to the NFT-Marketplace CLI");

    await spleep(100);
    rainbow.stop();
}

await welcome();

function handleInputContract() {
    let provider = new ethers.providers.InfuraProvider("sepolia", "09755767452a49d3a5b3f9b84d9db6c9");

    if (privateKey) {
        const wallet = new ethers.Wallet(privateKey);

        provider = wallet.connect(provider);
    }

    const sdk = new NFTMarketplaceSDK(provider, contractAddress, nftMarketplaceABI, nftABI, nftBytecode.bytecode, 'https://charity-file-storage.infura-ipfs.io/ipfs/');

    sdkInstance = sdk;
}

async function askForData() {
    const { contract } = await inquirer.prompt([
        {
            type: "input",
            name: "contract",
            message: "Enter your contract address:",
            default: "0x705279FAE070DEe258156940d88A6eCF5B302073",
        },
    ]);

    const { privateKey: key } = await inquirer.prompt([
        {
            type: "input",
            name: "privateKey",
            message: "Enter your wallet address:",
        },
    ]);

    contractAddress = contract;

    privateKey = key;

    handleInputContract();
}

await askForData();

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

    const filteredItems = itemsWithMetadata.filter((item) => item.price.toNumber() != 0).map(item => {
        return {
            id: item.id,
            name: item.data.name,
            description: item.data.description,
            price: item.price,
            owner: item.owner,
        }
    });

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

    if (owner == sdkInstance.signerOrProvider.address) {
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

    const filteredItems = itemsWithMetadata.filter((item) => item.price.toNumber() == 0 && item.owner != sdkInstance.signerOrProvider.address).map(item => {
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
    const offers = await sdkInstance.getAccountsOffers(sdkInstance.signerOrProvider.address);

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

    const filteredItems = items.filter((item) => item.owner == sdkInstance.signerOrProvider.address && item.price.toNumber() == 0);

    const ids = filteredItems.map((item) => item.id.toNumber());

    const idArr = Array.from(ids);

    const offerPromises = idArr.map((id) => sdkInstance.getOffers(id));

    const offers = await Promise.all(offerPromises); 

    offers.forEach((offer, index) => {
        offer.forEach((o) => {
            o.itemId = idArr[index];
        });
    });

    const offersFiltered = offers.filter((offer) => offer.length > 0).flat().filter((offer) => offer.seller === sdkInstance.signerOrProvider.address && offer.isAccepted == false);

    const choices = offersFiltered.map((offer) => {
        return {
            name: `ID: ${offer.itemId} - From: ${offer.offerer} - ${ethers.utils.formatEther(offer.price)} ETH`,
            value: {id: offer.itemId, offerer: offer.offerer},
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

async function askForOption() {
    const { option } = await inquirer.prompt([
        {
            type: "list",
            name: "option",
            message: "What do you want to do?",
            choices: ["Show all items", "Show item", "Buy item", "Make offer", "My offers", "Accept offer", "Exit"],
        },
    ]);

    if (option === "Show all items") {
        await showItems();
    } else if (option === "Show item") {
        await showItem();
    }
    else if (option === "Buy item") {
        await buyItem();
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
        process.exit();
    }

    await askForOption();
}

await askForOption();

