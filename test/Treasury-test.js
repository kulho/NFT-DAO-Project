var RLP = require("rlp");

const Treasury = artifacts.require("Treasury");
const Token = artifacts.require("GovernanceToken");
const Pool = artifacts.require("StakingPool");

const { expectRevert } = require("@openzeppelin/test-helpers");

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

contract("Governance token tests", (accounts) => {
  let token, stakingPool, treasury;

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
      let poolFee, price, token0, token1;
    });
  });

  describe("template", async () => {
    it.skip("template", async () => {
      assert(true);
    });
  });
});
