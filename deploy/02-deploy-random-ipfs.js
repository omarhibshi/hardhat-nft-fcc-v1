const { network, ethers } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")
const { networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const { storeImages, storeTokenMetadata } = require("../utils/uploadToPinata")

const FUND_AMOUNT = "1000000000000000000000"
const imagesLocation = "./images/randomNFT"
let tokenUris = []

const metaDataTemplate = {
    name: "",
    description: "",
    image: "",
    attributes: [{ trait_type: "", value: 100 }],
}

let tokenURIs = [
    "ipfs://QmTWcebDtejAzUbrgL6PAUgL9bbdeXtqb1XW31vUpWPX5F",
    "ipfs://QmYC9kBHtv7LVyaRLUSjM6iykhF42SkVtuxyYt4FG82psS",
    "ipfs://Qmf2QWbJWTmckeaENjPk3zqZrh7H4AuGdBRjXLiPVPFisK",
]

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    // get the IPFS hashes for our imagesvrfCoordinatorV2Mock

    if (process.env.UPLOAD_TO_PINATA === "true") {
        tokenURIs = await handleTokenURIs()
    }

    // 1. with our own IPFS node. https://docs.ipfs.io/
    // 2. Pinata https://pinata.cloud/
    // 3. NFT Storage https://nft.storage/

    let vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock

    if (developmentChains.includes(network.name)) {
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const txResp = await vrfCoordinatorV2Mock.createSubscription()
        const txReceipt = await txResp.wait(1)
        subscriptionId = txReceipt.events[0].args.subId
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2
        subscriptionId = networkConfig[chainId].subscriptionId
    }

    log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")

    // await storeImages(imagesLocation)

    const args = [
        vrfCoordinatorV2Address,
        subscriptionId,
        networkConfig[chainId].gasLane,
        networkConfig[chainId].callbackGasLimit,
        tokenURIs,
        networkConfig[chainId].mintFee,
    ]

    const randomNFT = await deploy("RandomIPFSNFT", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    log("|||||||||||||||||||||||||||||||||||||||||||||||||||||")
    if (!developmentChains.includes(network.name)) {
        await verify(randomNFT.address, args, network.name)
    }
    if (developmentChains.includes(network.name)) {
        await vrfCoordinatorV2Mock.addConsumer(
            subscriptionId.toNumber(),
            randomNFT.address
        )
    }
}

async function handleTokenURIs() {
    tokenURIs = []

    // stotre the images in IPFS
    // store the metadata in IPFSploy
    const { responses: imageUploadResponses, files } = await storeImages(
        imagesLocation
    )

    for (imageUploadResponsesIndex in imageUploadResponses) {
        // create the metadata
        // upload the metadata
        let tokenURIMetadata = { ...metaDataTemplate }
        // take the filename and remove the file extension .png
        tokenURIMetadata.name = files[imageUploadResponsesIndex].replace(
            ".png",
            ""
        )
        tokenURIMetadata.description = `An adorable ${tokenURIMetadata.name} pup! `
        tokenURIMetadata.image = `ipfs://${imageUploadResponses[imageUploadResponsesIndex].IpfsHash}`
        console.log(
            `Uploading metadata for ${tokenURIMetadata.name} to Pinata...`
        )
        // store the JSONto PINATA / IPFS
        const metadataUploadResponse = await storeTokenMetadata(
            tokenURIMetadata
        )
        tokenURIs.push(`ipfs://${metadataUploadResponse.IpfsHash}`)
    }
    console.log("Token URIs uploaded , They are: ")
    console.log(tokenURIs)
    return tokenURIs
}

module.exports.tags = ["randompfs", "all", "main"]
