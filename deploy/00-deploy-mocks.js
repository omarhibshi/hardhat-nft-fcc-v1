const { network } = require("hardhat")
const { DECIMALS, INITIAL_PRICE } = require("../helper-hardhat-config")
const { developmentChains } = require("../helper-hardhat-config")

const BASE_FEE = "250000000000000000" //ethers.utils.parseEther("0.25") //0.25 is the prmium. it cost 0.25 LINK per request
const GAS_PRICE_LINK = 1e9 // link per gas, is this the gas lane? // 0.000000001 LINK per gas

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const args = [BASE_FEE, GAS_PRICE_LINK]

    if (developmentChains.includes(network.name)) {
        log(`Local network "${network.name}" detected! deploying mocks ...`)
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: args,
        })
        await deploy("MockV3Aggregator", {
            from: deployer,
            log: true,
            args: [DECIMALS, INITIAL_PRICE],
        })
        log("Mocks 'VRFCoordinatorV2Mock' & 'MockV3Aggregator' Deployed")
        log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        log(
            "You are deploying to a local network, you'll need a local network running to interact"
        )
        log(
            "Please run `yarn hardhat console --network localhost` to interact with the deployed smart contracts!"
        )
        log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
    }
}

module.exports.tags = ["all", "mocks", "main"]
