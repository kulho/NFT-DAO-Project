var RLP = require("rlp");

const Treasury = artifacts.require("Treasury");
const GovernanceTimeLock = artifacts.require("GovernanceTimeLock");
const GovernanceToken = artifacts.require("GovernanceToken");
const StakingPool = artifacts.require("StakingPool");

const NONFUNGIBLE_POSITION_MANAGER =
  "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";
const SWAP_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
const WETH = "0xc778417e063141139fce010982780140aa0cd5ab";
const UNISWAP_FACTORY_V3 = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
const POOL_FEE = 3000;

var BN = web3.utils.BN;
const SQRTPRICEX96_WETH = new BN("3543191142285914205922034323214");
// const WETH_PRICE = 2000;
const SQRTPRICEX96_TOKEN = new BN("1771595571142957102961017161");
// const TOKEN_PRICE = 0.0005;

module.exports = async function (deployer, _, accounts) {
  let token = await GovernanceToken.deployed();
  let stakingPool = await StakingPool.deployed();

  let wethBN = new BN(WETH);
  let tokenBN = new BN(token.address);

  var sqrtPricex96;
  if (wethBN.lt(tokenBN)) {
    sqrtPricex96 = SQRTPRICEX96_WETH;
    console.log("Token0 is WETH");
  } else {
    sqrtPricex96 = SQRTPRICEX96_TOKEN;
    console.log("Token0 is token");
  }

  var nonce = await web3.eth.getTransactionCount(accounts[0], "pending");
  //   console.log(nonce);
  //   console.log(accounts[0]);
  var treasuryAddress =
    "0x" +
    web3.utils
      .sha3(RLP.encode([accounts[0], nonce + 1]))
      .slice(12)
      .substring(14);

  //   console.log(treasuryAddress);

  await token.transfer(treasuryAddress, web3.utils.toWei("10000", "ether"), {
    from: accounts[0],
  });

  await deployer.deploy(
    Treasury,
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
  let treasury = await Treasury.deployed();

  // TODO add treasury address to staking pool contract and transfer its ownership

  governanceTimeLock = await GovernanceTimeLock.deployed();
  await treasury.transferOwnership(governanceTimeLock.address, {
    from: accounts[0],
  });
};
