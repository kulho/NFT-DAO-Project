const Treasury = artifacts.require("Treasury");
const Token = artifacts.require("GovernanceToken");
const { expectRevert } = require("@openzeppelin/test-helpers");

EPOCH_ADDRESS = "0xBAc959f049066b3F699D1FbBd62a755c55C19752";
NAME = "GovernanceToken";
SYMBOL = "GTK";
INITIAL_POOL_PRICE = 2000;
INITIAL_ETH_LIQUIDITY = 5;
REWARD_RATE = 10;

contract("Governance token tests", (accounts) => {
  let token, treasury;

  beforeEach(async () => {
    token = await Token.new(
      NAME,
      SYMBOL,
      EPOCH_ADDRESS,
      REWARD_RATE,
      INITIAL_ETH_LIQUIDITY * INITIAL_POOL_PRICE
    );
    treasury = await Treasury.new();
  });

  it("template", async () => {
    assert(true);
  });

  it.skip("template", async () => {
    assert(true);
  });
});
