const { network } = require("hardhat")

const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    log("----------------------------------------------------")
    const args = []
    const basicNft = await deploy("BasicNFT", {
        from: deployer,
        argds: args,
        log: true,
        waitConfiramtion: network.config.blockConfirmations || 1,
    })

    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        log("verifying on etherscan ...")
        await verify(basicNft.address, args)
    }
}
module.exports.tags = ["basicnft", "all", "main"]
