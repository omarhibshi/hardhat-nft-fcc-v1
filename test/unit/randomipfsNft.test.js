const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("RandomIPFSNFT", async function () {
          let RandomIPFSNFT, VRFCoordinatorV2Mock, accounts, deployer, Min_Fee
          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              await deployments.fixture(["all", "mocks", "randomIPFSNFT"])
              RandomIPFSNFT = await ethers.getContract("RandomIPFSNFT")
              VRFCoordinatorV2Mock = await ethers.getContract(
                  "VRFCoordinatorV2Mock"
              )
              Min_Fee = await RandomIPFSNFT.getMintFee()
          })
          describe("constructor", () => {
              it("1 - sets starting values correctly", async function () {
                  const dogTokenUriZero = await RandomIPFSNFT.getDogTokenURIs(0)
                  const isInitialized = await RandomIPFSNFT.getInitialized()
                  assert(dogTokenUriZero.includes("ipfs://"))
                  assert.equal(isInitialized, true)
              })
              it("2 - Should deploys both NFT and Mock contract", async function () {
                  assert.notEqual(RandomIPFSNFT.address, "")
                  assert.notEqual(VRFCoordinatorV2Mock.address, "")
              })
          })
          describe("requestNft", () => {
              it("3 - fails if payment isn't sent with the request", async function () {
                  await expect(
                      RandomIPFSNFT.requestNft()
                  ).to.be.revertedWithCustomError(
                      RandomIPFSNFT,
                      "RandomIPFSNFT__NotEnoughEther"
                  )
              })
              it("4 - fails if payment sent is below Minting fee", async function () {
                  await expect(
                      RandomIPFSNFT.requestNft({ value: 1000000000000000 })
                  ).to.be.revertedWithCustomError(
                      RandomIPFSNFT,
                      "RandomIPFSNFT__OverZero_BelowMintFee"
                  )
              })
              it("5 - emits an event and kicks off a random word request", async function () {
                  await expect(
                      RandomIPFSNFT.requestNft({ value: Min_Fee.toString() })
                  ).to.emit(RandomIPFSNFT, "NFTRequested")
              })
              it("6 - Should save requestId with sender address", async function () {
                  const tx = await RandomIPFSNFT.requestNft({
                      value: Min_Fee.toString(),
                  })
                  const receipt = await tx.wait()
                  const requestId = receipt.events[1].args.requestId
                  assert.equal(
                      RandomIPFSNFT.s_requestIdToSender[requestId],
                      accounts.address
                  )
              })
          })
          describe("fulfillRandomWords", () => {
              it("7 - mints NFT after random number is returned", async function () {
                  await new Promise(async (resolve, reject) => {
                      RandomIPFSNFT.once("NFTMinted", async () => {
                          try {
                              const tokenUri = await RandomIPFSNFT.tokenURI("0")
                              const tokenCounter =
                                  await RandomIPFSNFT.getTokenCounter()
                              assert.equal(
                                  tokenUri.toString().includes("ipfs://"),
                                  true
                              )
                              assert.equal(tokenCounter.toString(), "1")
                              resolve()
                          } catch (e) {
                              console.log(e)
                              reject(e)
                          }
                      })
                      try {
                          const requestNftResponse =
                              await RandomIPFSNFT.requestNft({
                                  value: Min_Fee.toString(),
                              })
                          const requestNftReceipt =
                              await requestNftResponse.wait(1)
                          await VRFCoordinatorV2Mock.fulfillRandomWords(
                              requestNftReceipt.events[1].args.requestId,
                              RandomIPFSNFT.address
                          )
                      } catch (error) {
                          console.log(error)
                          reject(error)
                      }
                  })
              })
          })
          describe("getBreedFromModdedRng", () => {
              it("8 - should return pug if moddedRng < 10", async function () {
                  const expectedValue =
                      await RandomIPFSNFT.getBreedFromModdedRng(7)
                  assert.equal(0, expectedValue)
              })
              it("9 - should return shiba-inu if moddedRng is between 10 - 39", async function () {
                  const expectedValue =
                      await RandomIPFSNFT.getBreedFromModdedRng(21)
                  assert.equal(1, expectedValue)
              })
              it("10 - should return st. bernard if moddedRng is between 40 - 99", async function () {
                  const expectedValue =
                      await RandomIPFSNFT.getBreedFromModdedRng(77)
                  assert.equal(2, expectedValue)
              })
              it("11 - should revert if moddedRng > 99", async function () {
                  await expect(
                      RandomIPFSNFT.getBreedFromModdedRng(100)
                  ).to.be.revertedWithCustomError(
                      RandomIPFSNFT,
                      "RandomIPFSNFT__RangeOutOfBounds"
                  )
              })
          })
      })
