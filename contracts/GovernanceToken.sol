// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./interfaces/IEpoch.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol";

contract GovernanceToken is ERC20Votes, ReentrancyGuard {
    uint256 private _rewardRate;
    IEpoch private nft;
    mapping(uint256 => bool) private _isClaimed;

    constructor(
        string memory _name,
        string memory _symbol,
        address _nftAddress,
        uint256 _rate,
        uint256 _initialSupply
    ) ERC20(_name, _symbol) ERC20Permit(_name) {
        nft = IEpoch(_nftAddress);
        _mint(msg.sender, _initialSupply * 10**18);
        _rewardRate = _rate * 10**18;
    }

    function isClaimedByIndex(uint256 _index) external view returns (bool) {
        return _isClaimed[_index];
    }

    function claimTokenFromNfts() external nonReentrant {
        uint256 currentBalance = nft.balanceOf(msg.sender);
        require(currentBalance > 0, "You must own Epoch NFT to claim token");
        uint256 rewardCount = 0;
        uint256 nftIndex;
        for (uint256 i = 0; i < currentBalance; i++) {
            nftIndex = nft.tokenOfOwnerByIndex(msg.sender, i);
            if (_isClaimed[nftIndex] == false) {
                _isClaimed[nftIndex] = true;
                rewardCount += 1;
            }
        }
        require(rewardCount > 0, "All of your NFTs have already been claimed.");
        _mint(msg.sender, _rewardRate * rewardCount);
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }
}
