var RLP = require("rlp");

const Treasury = artifacts.require("Treasury");
const Token = artifacts.require("GovernanceToken");
const Pool = artifacts.require("StakingPool");
const UniswapPool = artifacts.require("IUniswapV3Pool");
const SwapRouter = artifacts.require("ISwapRouter");
const WETH9 = artifacts.require("IWETH9");

const { expectRevert } = require("@openzeppelin/test-helpers");
const { web3 } = require("@openzeppelin/test-helpers/src/setup");

EPOCH_ADDRESS = "0xBAc959f049066b3F699D1FbBd62a755c55C19752";
NAME = "GovernanceToken";
SYMBOL = "GTK";
INITIAL_POOL_PRICE = 2000;
INITIAL_ETH_LIQUIDITY = 5;
REWARD_RATE = 10;

const NONFUNGIBLE_POSITION_MANAGER =
  "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";
const SWAP_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
const WETH = "0xc778417E063141139Fce010982780140Aa0cD5Ab";
const UNISWAP_FACTORY_V3 = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
const POOL_FEE = 3000;

var BN = web3.utils.BN;
const SQRTPRICEX96_WETH = new BN("3543191142285914205922034323214");
const SQRTPRICEX96_TOKEN = new BN("1771595571142957102961017161");
const ZERO = new BN(0);

contract("Treasury tests", (accounts) => {
  let token, stakingPool, treasury;

  const swapWeth2Token = async (swapRouter, value) => {
    let params, block, timestamp;

    block = await web3.eth.getBlock("latest");
    timestamp = block.timestamp + 1000;

    params = {
      tokenIn: WETH,
      tokenOut: token.address,
      fee: POOL_FEE,
      recipient: accounts[0],
      deadline: timestamp,
      amountIn: value,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
    };
    await swapRouter.exactInputSingle(params);
  };

  const swapToken2Weth = async (swapRouter, value) => {
    let params, block, timestamp;

    block = await web3.eth.getBlock("latest");
    timestamp = block.timestamp + 1000;

    params = {
      tokenIn: token.address,
      tokenOut: WETH,
      fee: POOL_FEE,
      recipient: accounts[0],
      deadline: timestamp,
      amountIn: value,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
    };
    await swapRouter.exactInputSingle(params);
  };

  beforeEach(async () => {
    token = await Token.new(
      NAME,
      SYMBOL,
      EPOCH_ADDRESS,
      REWARD_RATE,
      INITIAL_ETH_LIQUIDITY * INITIAL_POOL_PRICE
    );
    stakingPool = await Pool.new(token.address, accounts[0]);
    let wethBN = new BN(WETH);
    let tokenBN = new BN(token.address);

    var sqrtPricex96;
    if (wethBN.lt(tokenBN)) {
      sqrtPricex96 = SQRTPRICEX96_WETH;
    } else {
      sqrtPricex96 = SQRTPRICEX96_TOKEN;
    }

    var nonce = await web3.eth.getTransactionCount(accounts[0], "pending");
    var treasuryAddress =
      "0x" +
      web3.utils
        .sha3(RLP.encode([accounts[0], nonce + 1]))
        .slice(12)
        .substring(14);

    await token.transfer(treasuryAddress, web3.utils.toWei("10000", "ether"), {
      from: accounts[0],
    });
    treasury = await Treasury.new(
      NONFUNGIBLE_POSITION_MANAGER,
      SWAP_ROUTER,
      UNISWAP_FACTORY_V3,
      token.address,
      WETH,
      POOL_FEE,
      sqrtPricex96,
      stakingPool.address,
      { value: web3.utils.toWei("5", "ether") }
    );
  });

  describe("constructor", async () => {
    it("parameters are correctly initialized", async () => {
      let nfps,
        swapRouter,
        factory,
        tokenAddress,
        weth,
        poolFee,
        stakingPoolAddress;

      nfps = await treasury.nonfungiblePositionManager();
      assert.equal(nfps, NONFUNGIBLE_POSITION_MANAGER);

      swapRouter = await treasury.swapRouter();
      assert.equal(swapRouter, SWAP_ROUTER);

      factory = await treasury.factory();
      assert.equal(factory, UNISWAP_FACTORY_V3);

      weth = await treasury.WETH9();
      assert.equal(weth, WETH);

      tokenAddress = await treasury.token();
      assert.equal(tokenAddress, token.address);

      poolFee = await treasury.poolFee();
      assert.equal(poolFee, POOL_FEE);

      stakingPoolAddress = await treasury.stakingPool();
      assert.equal(stakingPoolAddress, stakingPool.address);
    });

    it("uniswap pool initialized correctly", async () => {
      let poolFee, liquidity, token0, token1, uniswapPool, poolAddress, slot0;
      poolAddress = await treasury.uniswapPool();
      uniswapPool = await UniswapPool.at(poolAddress);

      poolFee = await uniswapPool.fee();
      assert.equal(poolFee, POOL_FEE);

      liquidity = await uniswapPool.liquidity();
      assert(liquidity.gt(ZERO));

      slot0 = await uniswapPool.slot0();
      token0 = await uniswapPool.token0();
      token1 = await uniswapPool.token1();

      let wethBN = new BN(WETH);
      let tokenBN = new BN(token.address);

      if (wethBN.lt(tokenBN)) {
        assert.equal(
          slot0.sqrtPriceX96.toString(),
          SQRTPRICEX96_WETH.toString()
        );
        assert.equal(token0, WETH);
        assert.equal(token1, token.address);
      } else {
        assert.equal(
          slot0.sqrtPriceX96.toString(),
          SQRTPRICEX96_TOKEN.toString()
        );
        assert.equal(token0, token.address);
        assert.equal(token1, WETH);
      }
    });
  });

  describe("collectAllFees", async () => {
    it("its is possible to collect fees", async () => {
      let swapRouter,
        weth9,
        wethValue,
        tokenValue,
        tokenBalanceBefore,
        tokenBalanceAfter,
        wethBalanceBefore,
        wethBalanceAfter;
      // create contracts
      weth9 = await WETH9.at(WETH);
      swapRouter = await SwapRouter.at(SWAP_ROUTER);

      // get weth and swap it for tokens
      wethValue = web3.utils.toWei("2", "ether");
      await weth9.deposit({ from: accounts[0], value: wethValue });
      await weth9.approve(SWAP_ROUTER, wethValue, { from: accounts[0] });
      await swapWeth2Token(swapRouter, wethValue);

      // assert weth was swapped
      tokenValue = await token.balanceOf(accounts[0]);
      assert(tokenValue.gt(ZERO));

      // approve and swap tokens to weth
      await token.approve(SWAP_ROUTER, tokenValue, { from: accounts[0] });
      await swapToken2Weth(swapRouter, tokenValue.toString());

      // assert tokens were swapped
      wethValue = await weth9.balanceOf(accounts[0]);
      assert(wethValue.gt(ZERO));

      // balance before
      tokenBalanceBefore = await token.balanceOf(treasury.address);
      wethBalanceBefore = await weth9.balanceOf(treasury.address);
      // collect fees
      await treasury.collectAllFees();
      // balance after
      tokenBalanceAfter = await token.balanceOf(treasury.address);
      wethBalanceAfter = await weth9.balanceOf(treasury.address);
      // assert fees were received
      assert(tokenBalanceBefore.lt(tokenBalanceAfter));
      assert(wethBalanceBefore.lt(wethBalanceAfter));
    });

    it("should revert if not called by the owner", async () => {
      await expectRevert(
        treasury.collectAllFees({ from: accounts[1] }),
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("swapAllWeth", async () => {
    it("it is possible to swap weth for token", async () => {
      let weth9, wethValue, balanceBefore, balanceAfter;
      weth9 = await WETH9.at(WETH);
      wethValue = web3.utils.toWei("2", "ether");
      await weth9.deposit({ from: accounts[0], value: wethValue });
      await weth9.transfer(treasury.address, wethValue);

      balanceBefore = await token.balanceOf(treasury.address);
      await treasury.swapAllWeth();
      balanceAfter = await token.balanceOf(treasury.address);

      assert(balanceBefore.lt(balanceAfter));
    });

    it("it is possible to swap eth for token", async () => {
      let balanceBefore, balanceAfter;
      await web3.eth.sendTransaction({
        from: accounts[0],
        to: treasury.address,
        value: web3.utils.toWei("2", "ether"),
      });
      balanceBefore = await token.balanceOf(treasury.address);
      await treasury.swapAllWeth();
      balanceAfter = await token.balanceOf(treasury.address);

      assert(balanceBefore.lt(balanceAfter));
    });

    it("eth and weth should add and swap for token", async () => {
      let weth9, wethValue, balanceBefore, balanceAfter;

      weth9 = await WETH9.at(WETH);
      wethValue = web3.utils.toWei("2", "ether");
      await weth9.deposit({ from: accounts[0], value: wethValue });
      await weth9.transfer(treasury.address, wethValue);

      await web3.eth.sendTransaction({
        from: accounts[0],
        to: treasury.address,
        value: web3.utils.toWei("2", "ether"),
      });

      balanceBefore = await token.balanceOf(treasury.address);
      await treasury.swapAllWeth();
      balanceAfter = await token.balanceOf(treasury.address);

      assert(balanceBefore.lt(balanceAfter));
    });

    it("should revert if no eth or weth in the contracts", async () => {
      await expectRevert(treasury.swapAllWeth(), "AS");
    });

    it("should revert if not called by the owner", async () => {
      await expectRevert(
        treasury.swapAllWeth({ from: accounts[1] }),
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("approveToPool", async () => {
    it("it is possible to approve tokens to the pool", async () => {
      let balance, allowance;
      await web3.eth.sendTransaction({
        from: accounts[0],
        to: treasury.address,
        value: web3.utils.toWei("2", "ether"),
      });
      await treasury.swapAllWeth();
      await treasury.approveToPool();
      balance = await token.balanceOf(treasury.address);
      allowance = await token.allowance(treasury.address, stakingPool.address);
      assert(balance.eq(allowance));
    });

    it("approved tokens can be withdrawn from the treasury", async () => {
      let balanceBefore, balanceAfter;
      await stakingPool.setTreasuryAddress(treasury.address);
      await web3.eth.sendTransaction({
        from: accounts[0],
        to: treasury.address,
        value: web3.utils.toWei("2", "ether"),
      });
      await treasury.swapAllWeth();
      await treasury.approveToPool();
      balanceBefore = await token.balanceOf(treasury.address);
      await stakingPool.notifyReward();
      balanceAfter = await token.balanceOf(stakingPool.address);
      assert(balanceBefore.eq(balanceAfter));
    });

    it("should revert if not called by the owner", async () => {
      await expectRevert(
        treasury.approveToPool({ from: accounts[1] }),
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("integration test", async () => {
    it("create and collect fees, swap to token, approve pool and collect by the pool", async () => {
      let swapRouter, weth9, wethValue, tokenValue, rewardRate, i;
      // create contracts
      weth9 = await WETH9.at(WETH);
      swapRouter = await SwapRouter.at(SWAP_ROUTER);

      // get weth and swap it for tokens
      wethValue = web3.utils.toWei("2", "ether");
      await weth9.deposit({ from: accounts[0], value: wethValue });

      for (i = 0; i < 50; i++) {
        wethValue = await weth9.balanceOf(accounts[0]);
        await weth9.approve(SWAP_ROUTER, wethValue, { from: accounts[0] });
        await swapWeth2Token(swapRouter, wethValue.toString());

        // assert weth was swapped
        tokenValue = await token.balanceOf(accounts[0]);

        // approve and swap tokens to weth
        await token.approve(SWAP_ROUTER, tokenValue, { from: accounts[0] });
        await swapToken2Weth(swapRouter, tokenValue.toString());
      }

      // collect fees
      await treasury.collectAllFees();
      // swap collected weth for token
      await treasury.swapAllWeth();
      // approve all tokens to staking pool
      await treasury.approveToPool();
      // set treasury address to the staking pool and get token balance
      await stakingPool.setTreasuryAddress(treasury.address);
      // notify the rewards to the staking pool and assert new rewardRate is greater than zero
      await stakingPool.notifyReward();
      rewardRate = await stakingPool.rewardRate();
      assert(rewardRate.gt(ZERO));
    });
  });
});
