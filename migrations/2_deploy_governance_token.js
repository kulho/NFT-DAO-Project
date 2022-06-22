const GovernanceToken = artifacts.require("GovernanceToken");
const Pool = artifacts.require("IUniswapV3Pool");

EPOCH_ADDRESS = "0xBAc959f049066b3F699D1FbBd62a755c55C19752";
NAME = "GovernanceToken";
SYMBOL = "GTK";
INITIAL_POOL_PRICE = 2000;
INITIAL_ETH_LIQUIDITY = 5;
REWARD_RATE = 10;

module.exports = async function (deployer, _, accounts) {
  await deployer.deploy(
    GovernanceToken,
    NAME,
    SYMBOL,
    EPOCH_ADDRESS,
    REWARD_RATE,
    INITIAL_ETH_LIQUIDITY * INITIAL_POOL_PRICE
  );
  governanceToken = await GovernanceToken.deployed();

  await governanceToken.delegate(accounts[0], { from: accounts[0] });
};
