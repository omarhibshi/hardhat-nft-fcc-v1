const { network, ethers } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")

module.exports = async ({ getNamedAccounts }) => {
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    // Basic NFT
    const basicNFT = await ethers.getContract("BasicNFT", deployer)
    const basicNFTAddress = basicNFT.address
    const basicMinTX = await basicNFT.mintNft()
    await basicMinTX.wait(1)
    const basicNFTTokenUri = await basicNFT.tokenURI(0)
    console.log(`Basic NFT index 0 has tokenURI ${basicNFTTokenUri}`)

    // Dynamic IPFS NFT
    let dynamicNFTTokenUri
    const highValue = ethers.utils.parseEther("4000")
    const dynamicNFT = await ethers.getContract("DynamicSVGNFT", deployer)
    const dynamicNFTAddress = dynamicNFT.address
    const dynamicNFTMinTX = await dynamicNFT.mintNft(highValue)
    await dynamicNFTMinTX.wait(1)
    try {
        dynamicNFTTokenUri = await dynamicNFT.tokenURI(0)
    } catch (e) {
        dynamicNFTTokenUri = "Error: Token URI not found"
        console.log(e)
    }
    console.log(`Dynamic NFT index 0 has tokenURI: ${dynamicNFTTokenUri}`)

    // Random IPFS NFT
    const randomNFT = await ethers.getContract("RandomIPFSNFT", deployer)
    const mint_fee = await randomNFT.getMintFee()
    const increase_mint_fee = mint_fee.mul(2)
    const decrease_mint_fee = mint_fee.div(2)
    const randomNFTMinTX = await randomNFT.requestNft({
        value: mint_fee.toString(),
    })
    const randomNFTMinReceipt = await randomNFTMinTX.wait(1)

    // setting up a listener for the NFTRequested event
    await new Promise(async (resolve, reject) => {
        setTimeout(
            () => reject("Timeout: 'NFTMinted' event did not fire"),
            300000
        )
        randomNFT.once("NFTMinted", async () => {
            console.log(
                `Random IPFS NFT index 0 tokenURI: ${await randomNFT.tokenURI(
                    0
                )}`
            )
            resolve() // resolve the promise
        })

        if (developmentChains.includes(network.name)) {
            const requestId = randomNFTMinReceipt.events[1].args.requestId
            const vrfCoordinatorV2Mock = await ethers.getContract(
                "VRFCoordinatorV2Mock",
                deployer
            )
            await vrfCoordinatorV2Mock.fulfillRandomWords(
                requestId,
                randomNFT.address
            )
        }
    })
}

module.exports.tags = ["all", "mint"]
