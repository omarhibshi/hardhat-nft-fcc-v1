// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.8;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "hardhat/console.sol";

error RandomIPFSNFT__AlreadyInitialized();
error RandomIPFSNFT__NotEnoughEther();
error RandomIPFSNFT__RangeOutOfBounds();
error RandomIPFSNFT__TransferFailed();
error RandomIPFSNFT__OverZero_BelowMintFee();

contract RandomIPFSNFT is VRFConsumerBaseV2, ERC721URIStorage, Ownable {
    // When we mint an NFT, we will trigger a Chainlink VRF call to get a random number
    // using that number, we will generate a random IPFS hash
    // the randome NFT will either be a, Pug, Shiba Inu, or a St. Bernard
    // Pug          super rare
    // Shiba Inu    rare
    // St. Bernard  common

    // users have to pay  to mint an NFT
    // the owner of the contract can withdraw the funds

    // Type declarations
    enum Breed {
        PUG,
        SHIBA_INU,
        ST_BERNARD
    }

    // Chainlink VRF Helpers
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_SubscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORD = 1;

    // NFT Variables
    uint256 internal immutable i_mintFee;
    uint256 public s_tokenCounter;
    uint256 internal constant MAX_CHANCE_VALUE = 100;
    string[] internal s_dogTokrenURIs;
    bool private s_initialized;

    // VRF Helpers
    mapping(uint256 => address) public s_requestIdToSender;

    event NFTRequested(uint256 indexed requestId, address requester);
    event NFTMinted(Breed dogBreed, address minter);

    constructor(
        address _vrfCoordinatorV2,
        uint64 _SubscriptionId,
        bytes32 _gasLane,
        uint32 _callbackGasLimit,
        string[3] memory _dogTokrenURIs,
        uint256 _mintFee
    ) VRFConsumerBaseV2(_vrfCoordinatorV2) ERC721("Random IPFS NFT", "RIN") {
        i_vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinatorV2);
        i_gasLane = _gasLane;
        i_SubscriptionId = _SubscriptionId;
        i_mintFee = _mintFee;
        i_callbackGasLimit = _callbackGasLimit;
        initializeContract(_dogTokrenURIs);
        s_tokenCounter = 0;
    }

    function requestNft() public payable returns (uint256 requestId) {
        if (msg.value > 0 && msg.value < i_mintFee) {
            revert RandomIPFSNFT__OverZero_BelowMintFee();
        }
        if (msg.value == 0) {
            revert RandomIPFSNFT__NotEnoughEther();
        }
        requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_SubscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORD
        );
        s_requestIdToSender[requestId] = msg.sender;
        console.log(
            "s_requestIdToSender[requestId] in requestNft(): %s",
            s_requestIdToSender[requestId]
        );
        emit NFTRequested(requestId, msg.sender);
    }

    function fulfillRandomWords(
        uint256 _requestId,
        uint256[] memory _randomWords
    ) internal override {
        // use the random number to generate a random IPFS hash
        // use the random number to determine which NFT to mint
        address dogOwner = s_requestIdToSender[_requestId];
        uint256 newTokenId = s_tokenCounter;
        s_tokenCounter = s_tokenCounter + 1;
        console.log("Dog Owner in fulfillRandomWords() is %s", dogOwner);

        // we use mod operator (%) to get a number between 0 and 99
        uint256 moddedRng = _randomWords[0] % MAX_CHANCE_VALUE;
        Breed dogBreed = getBreedFromModdedRng(moddedRng);

        _safeMint(dogOwner, newTokenId);
        _setTokenURI(newTokenId, s_dogTokrenURIs[uint256(dogBreed)]);
        emit NFTMinted(dogBreed, dogOwner);
    }

    function getChanceArray() public pure returns (uint256[3] memory) {
        return [10, 30, MAX_CHANCE_VALUE];
    }

    function initializeContract(string[3] memory _dogTokenUris) private {
        if (s_initialized) {
            revert RandomIPFSNFT__AlreadyInitialized();
        }
        s_dogTokrenURIs = _dogTokenUris;
        s_initialized = true;
    }

    function getBreedFromModdedRng(
        uint256 _moddedRng
    ) public pure returns (Breed) {
        uint256 cumulativeSum = 0;
        uint256[3] memory chanceArray = getChanceArray();

        for (uint256 i = 0; i < chanceArray.length; i++) {
            if (_moddedRng >= cumulativeSum && _moddedRng < chanceArray[i]) {
                return Breed(i);
            }
            cumulativeSum = chanceArray[i];
        }
        revert RandomIPFSNFT__RangeOutOfBounds();
    }

    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = payable(msg.sender).call{value: balance}("");
        if (!success) {
            revert RandomIPFSNFT__TransferFailed();
        }

        //payable(owner()).transfer(address(this).balance);
    }

    function getMintFee() public view returns (uint256) {
        console.log("Mint Fee: %s", i_mintFee);

        return i_mintFee;
    }

    function getDogTokenURIs(
        uint256 index
    ) public view returns (string memory) {
        return s_dogTokrenURIs[index];
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }

    function getInitialized() public view returns (bool) {
        return s_initialized;
    }
}
