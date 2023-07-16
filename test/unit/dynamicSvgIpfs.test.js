const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("DynamicSVGNFT", async function () {
          let dynamicSVGNFT,
              mockV3Aggregator,
              accounts,
              deployer,
              lowImageSVG,
              highImageSVG,
              ethUSDPriceFeed,
              tokenCounter
          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]

              await deployments.fixture(["all", "dynamicsvg", "main"])
              dynamicSVGNFT = await ethers.getContract("DynamicSVGNFT")
              mockV3Aggregator = await ethers.getContract("MockV3Aggregator")
          })
          describe("constructor", () => {
              it("1 - Should deploys both NFT and Mock contract", async function () {
                  assert.notEqual(dynamicSVGNFT.address, "")
                  assert.notEqual(mockV3Aggregator.address, "")
              })
              it("2 - sets starting values correctly", async function () {
                  lowImageSVG = await dynamicSVGNFT.getlowImageSVG()
                  highImageSVG = await dynamicSVGNFT.getHighImageSVG()
                  ethUSDPriceFeed = await dynamicSVGNFT.getPriceFeedAddress()
                  tokenCounter = await dynamicSVGNFT.getTokenCounter()

                  assert(lowImageSVG.includes("data:image/svg+xml;base64,"))
                  assert(highImageSVG.includes("data:image/svg+xml;base64,"))
                  assert.equal(ethUSDPriceFeed, mockV3Aggregator.address)
                  assert.equal(tokenCounter, 0)
              })
          })
      })
