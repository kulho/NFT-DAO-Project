const Pool = artifacts.require("StakingPool");
const Token = artifacts.require("GovernanceToken");
const { expectRevert } = require("@openzeppelin/test-helpers");

EPOCH_ADDRESS = "0xBAc959f049066b3F699D1FbBd62a755c55C19752";
NAME = "GovernanceToken";
SYMBOL = "GTK";
INITIAL_POOL_PRICE = 2000;
INITIAL_ETH_LIQUIDITY = 5;
REWARD_RATE = 10;

contract("Staking pool tests", (accounts) => {
  let token, pool;

  beforeEach(async () => {
    token = await Token.new(
      NAME,
      SYMBOL,
      EPOCH_ADDRESS,
      REWARD_RATE,
      INITIAL_ETH_LIQUIDITY * INITIAL_POOL_PRICE
    );
    pool = await Pool.new(token.address, accounts[0]);
  });

  it("it is possible to stake tokens", async () => {
    let balance = await token.balanceOf(accounts[0]);
    await token.approve(pool.address, balance);
    await pool.stake(balance);
  });

  it.skip("it is possible to withdraw tokens", async () => {
    assert(true);
  });

  it.skip("it is possible to exit", async () => {
    assert(true);
  });

  it.skip("it is possible to set the delegation address", async () => {
    assert(true);
  });

  it.skip("it is possible to notify the new rewards", async () => {
    assert(true);
  });

  it.skip("it is possible to collect rewards", async () => {
    assert(true);
  });

  it.skip("it is possible to set the new rewards duration", async () => {
    assert(true);
  });

  it.skip("it is possible to update reward", async () => {
    assert(true);
  });

  it.skip("template", async () => {
    assert(true);
  });

  it.skip("template", async () => {
    assert(true);
  });

  it.skip("template", async () => {
    assert(true);
  });

  it.skip("template", async () => {
    assert(true);
  });
});
