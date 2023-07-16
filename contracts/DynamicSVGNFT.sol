// DynamicSVGNFT
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "base64-sol/base64.sol";
import "hardhat/console.sol";

error ERC721Metadata__URI_QueryFor_NonExistentToken();

contract DynamicSVGNFT is ERC721 {
    // mint
    // store our SVG information somewhere
    // some logic to say "Show x image" or "Show y image"
    uint256 private s_tokenCounter;
    string private s_lowImageSVG;
    string private s_highImageSVG;

    mapping(uint256 => int256) public s_tokenIdToHighPrice;
    AggregatorV3Interface internal immutable i_priceFeed;
    event CreatedSVGNFT(uint256 indexed tokenId, int256 highPrice);

    constructor(
        address _priceFeedAddress,
        string memory _lowSVG,
        string memory _highSVG
    ) ERC721("Dynamic SVG NFT", "DSN") {
        s_tokenCounter = 0;
        i_priceFeed = AggregatorV3Interface(_priceFeedAddress);
        s_lowImageSVG = svgToImageURI(_lowSVG);
        s_highImageSVG = svgToImageURI(_highSVG);
    }

    function mintNft(int256 highValue) public {
        s_tokenIdToHighPrice[s_tokenCounter] = highValue;
        _safeMint(msg.sender, s_tokenCounter);
        s_tokenCounter = s_tokenCounter + 1;
        emit CreatedSVGNFT(s_tokenCounter, highValue);
    }

    function svgToImageURI(
        string memory _svg
    ) public pure returns (string memory) {
        string memory svgBase64Encoded = Base64.encode(
            bytes(string(abi.encodePacked(_svg)))
        );

        string memory c_base64EncodeSVGPrefix = "data:image/svg+xml;base64,";
        return
            string(abi.encodePacked(c_base64EncodeSVGPrefix, svgBase64Encoded));
    }

    function _baseURI() internal pure override returns (string memory) {
        return "data:application/json;base64,";
    }

    function tokenURI(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        if (!_exists(tokenId)) {
            revert ERC721Metadata__URI_QueryFor_NonExistentToken();
        }

        (, int256 price, , , ) = i_priceFeed.latestRoundData();
        string memory imageURI = s_lowImageSVG;

        if (price >= s_tokenIdToHighPrice[tokenId]) {
            imageURI = s_highImageSVG;
        }

        // datat:image/svg+xml;base64,
        // data:appication/json;base64,
        return
            string(
                abi.encodePacked(
                    _baseURI(),
                    Base64.encode(
                        bytes(
                            abi.encodePacked(
                                '{"name":',
                                name(),
                                '", "description":"An NFT that changes based on the Chainlink Feed", ',
                                '"attributes": [{"trait_type": "coolness", "value": 100}], "image":"',
                                imageURI,
                                '"}'
                            )
                        )
                    )
                )
            );
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }

    function getlowImageSVG() public view returns (string memory) {
        return s_lowImageSVG;
    }

    function getHighImageSVG() public view returns (string memory) {
        return s_highImageSVG;
    }

    function getPriceFeedAddress() public view returns (address) {
        return address(i_priceFeed);
    }
}
