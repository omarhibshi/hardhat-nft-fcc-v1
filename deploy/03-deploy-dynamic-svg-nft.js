const { network, ethers } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")
const { networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const fs = require("fs")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    let ethUsdPriceFeedAddress

    if (developmentChains.includes(network.name)) {
        const ethUSDAggregator = await ethers.getContract("MockV3Aggregator")
        ethUsdPriceFeedAddress = ethUSDAggregator.address
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId].ethUsdPriceFeed
    }
    log("----------------------")

    const lowSVG = fs.readFileSync("./images/dynamicNFT/frown.svg", {
        encoding: "utf-8",
    })
    const highSVG = fs.readFileSync("./images/dynamicNFT/happy.svg", {
        encoding: "utf-8",
    })

    const args = [ethUsdPriceFeedAddress, lowSVG, highSVG]

    const dynamicSVGNFT = await deploy("DynamicSVGNFT", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    log("|||||||||||||||||||||||||||||||||||||||||||||||||||||")

    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        log("verifying on etherscan ...")
        await verify(dynamicSVGNFT.address, args)
    }
}
module.exports.tags = ["all", "dynamicsvg", "main"]
