// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-core/contracts/libraries/TickMath.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@uniswap/v3-periphery/contracts/base/LiquidityManagement.sol";
import "@uniswap/v3-periphery/contracts/base/PeripheryImmutableState.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";

contract Treasury is IERC721Receiver, PeripheryImmutableState, Ownable {
    address public immutable token;
    address public immutable stakingPool;
    address public uniswapPool;
    uint24 public immutable poolFee;
    uint256 public immutable tokenId;

    INonfungiblePositionManager public immutable nonfungiblePositionManager;
    ISwapRouter public immutable swapRouter;

    /// @notice Represents the deposit of an NFT
    struct Deposit {
        address owner;
        uint128 liquidity;
        address token0;
        address token1;
    }

    /// @dev deposits[tokenId] => Deposit
    mapping(uint256 => Deposit) public deposits;

    // initialize nonfungiblePositionManager, token address and get initial eth liquidity
    constructor(
        address _nonfungiblePositionManager,
        address _swapRouter,
        address _factory,
        address _token,
        address _WETH,
        uint24 _poolFee,
        uint160 _sqrtpricex96,
        address _stakingPool
    ) payable PeripheryImmutableState(_factory, _WETH) {
        stakingPool = _stakingPool;
        nonfungiblePositionManager = INonfungiblePositionManager(
            _nonfungiblePositionManager
        );
        swapRouter = ISwapRouter(_swapRouter);
        token = _token;
        poolFee = _poolFee;
        (tokenId, uniswapPool) = setupUniswapPool(_sqrtpricex96);
    }

    // Implementing `onERC721Received` so this contract can receive custody of erc721 tokens
    function onERC721Received(
        address operator,
        address,
        uint256 _tokenId,
        bytes calldata
    ) external override returns (bytes4) {
        // get position information

        _createDeposit(operator, _tokenId);

        return this.onERC721Received.selector;
    }

    function _createDeposit(address owner, uint256 _tokenId) internal {
        (
            ,
            ,
            address token0,
            address token1,
            ,
            ,
            ,
            uint128 liquidity,
            ,
            ,
            ,

        ) = nonfungiblePositionManager.positions(_tokenId);

        // set the owner and data for position
        // operator is msg.sender
        deposits[_tokenId] = Deposit({
            owner: owner,
            liquidity: liquidity,
            token0: token0,
            token1: token1
        });
    }

    /// @notice Calls the mint function defined in periphery.
    /// @return _tokenId The id of the newly minted ERC721
    /// @return _uniswapPool The amount of token0
    function setupUniswapPool(uint160 _sqrtpricex96)
        private
        returns (uint256 _tokenId, address _uniswapPool)
    {
        require(uniswapPool == address(0), "Liquidity can be minted only once");

        address token0;
        address token1;
        uint256 token0Balance;
        uint256 token1Balance;
        uint256 amount0;
        uint256 amount1;

        if (token < WETH9) {
            token0 = token;
            token1 = WETH9;
            token0Balance = IERC20(token0).balanceOf(address(this));
            token1Balance = address(this).balance;

            TransferHelper.safeApprove(
                token0,
                address(nonfungiblePositionManager),
                token0Balance
            );
        } else {
            token0 = WETH9;
            token1 = token;
            token0Balance = address(this).balance;
            token1Balance = IERC20(token1).balanceOf(address(this));

            TransferHelper.safeApprove(
                token1,
                address(nonfungiblePositionManager),
                token1Balance
            );
        }
        require(token0 != address(0));

        // create a new pool
        // nonfungiblePositionManager crashes for unknown reason - no revert and crashes debugger
        // uniswapPool = nonfungiblePositionManager
        //     .createAndInitializePoolIfNecessary(
        //         token0,
        //         token1,
        //         poolFee,
        //         _sqrtpricex96
        //     );

        _uniswapPool = IUniswapV3Factory(factory).createPool(
            token0,
            token1,
            poolFee
        );
        IUniswapV3PoolActions(_uniswapPool).initialize(_sqrtpricex96);

        // For this example, we will provide equal amounts of liquidity in both assets.
        // Providing liquidity in both assets means liquidity will be earning fees and is considered in-range.
        int24 tickSpacing = IUniswapV3Factory(factory).feeAmountTickSpacing(
            poolFee
        );
        int24 _tickAtPrice = TickMath.getTickAtSqrtRatio(_sqrtpricex96);
        int24 _tickLower = ((_tickAtPrice - 120) / tickSpacing) * tickSpacing;
        int24 _tickUpper = ((_tickAtPrice + 120) / tickSpacing) * tickSpacing;

        INonfungiblePositionManager.MintParams
            memory params = INonfungiblePositionManager.MintParams({
                token0: token0,
                token1: token1,
                fee: poolFee,
                tickLower: _tickLower,
                tickUpper: _tickUpper,
                amount0Desired: token0Balance,
                amount1Desired: token1Balance,
                amount0Min: 0,
                amount1Min: 0,
                recipient: address(this),
                deadline: block.timestamp
            });

        // Note that the pool defined by token/WETH and fee tier 0.3% must already be created and initialized in order to mint
        (_tokenId, , amount0, amount1) = nonfungiblePositionManager.mint{
            value: address(this).balance
        }(params);

        // Create a deposit
        _createDeposit(msg.sender, _tokenId);

        // Remove allowance and refund in both assets.
        if (token < WETH9) {
            if (amount0 < token0Balance) {
                TransferHelper.safeApprove(
                    token0,
                    address(nonfungiblePositionManager),
                    0
                );
                uint256 refund0 = token0Balance - amount0;
                TransferHelper.safeTransfer(token0, msg.sender, refund0);
            }
        } else {
            if (amount1 < token1Balance) {
                TransferHelper.safeApprove(
                    token1,
                    address(nonfungiblePositionManager),
                    0
                );
                uint256 refund1 = token1Balance - amount1;
                TransferHelper.safeTransfer(token1, msg.sender, refund1);
            }
        }

        nonfungiblePositionManager.refundETH();
        if (address(this).balance > 0)
            TransferHelper.safeTransferETH(msg.sender, address(this).balance);
    }

    /// @notice Collects the fees associated with provided liquidity
    /// @dev The contract must hold the erc721 token before it can collect fees
    /// @return amount0 The amount of fees collected in token0
    /// @return amount1 The amount of fees collected in token1
    function collectAllFees()
        external
        onlyOwner
        returns (uint256 amount0, uint256 amount1)
    {
        // Caller must own the ERC721 position, meaning it must be a deposit

        // set amount0Max and amount1Max to uint256.max to collect all fees
        // alternatively can set recipient to msg.sender and avoid another transaction in `sendToOwner`
        INonfungiblePositionManager.CollectParams
            memory params = INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: address(this),
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            });

        (amount0, amount1) = nonfungiblePositionManager.collect(params);
    }

    /// @notice swapAllWeth swaps a fixed amount of DAI for a maximum possible amount of WETH9
    /// using the DAI/WETH9 0.3% pool by calling `exactInputSingle` in the swap router.
    /// @dev The calling address must approve this contract to spend at least `amountIn` worth of its DAI for this function to succeed.
    function swapAllWeth() external onlyOwner returns (uint256 amountOut) {
        uint256 ethBalance = address(this).balance;
        // if there is some balance in ether swap to WETH
        if (ethBalance > 0) {
            // Swap ETH for WETH
            (bool success, ) = WETH9.call{value: ethBalance}("");
            require(success, "Failed to get WETH");
        }
        // get current WETH balance
        uint256 wethBalance = IERC20(WETH9).balanceOf(address(this));

        // Approve the router to spend WETH.
        TransferHelper.safeApprove(WETH9, address(swapRouter), wethBalance);

        // Naively set amountOutMinimum to 0. In production, use an oracle or other data source to choose a safer value for amountOutMinimum.
        // We also set the sqrtPriceLimitx96 to be 0 to ensure we swap our exact input amount.
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: WETH9,
                tokenOut: token,
                fee: poolFee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: wethBalance,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

        // The call to `exactInputSingle` executes the swap.
        amountOut = swapRouter.exactInputSingle(params);
    }

    function transferToPool() external onlyOwner {
        uint256 value = IERC20(token).balanceOf(address(this));
        TransferHelper.safeTransfer(token, stakingPool, value);
    }

    receive() external payable {}
}
