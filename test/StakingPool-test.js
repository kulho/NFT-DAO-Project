const Pool = artifacts.require("StakingPool");
const Token = artifacts.require("GovernanceToken");
const { expectRevert, BN } = require("@openzeppelin/test-helpers");
const { time } = require("@openzeppelin/test-helpers");

EPOCH_ADDRESS = "0xBAc959f049066b3F699D1FbBd62a755c55C19752";
NAME = "GovernanceToken";
SYMBOL = "GTK";
INITIAL_POOL_PRICE = 2000;
INITIAL_ETH_LIQUIDITY = 5;
REWARD_RATE = 10;
WEEK = 604800;

contract("Staking pool tests", async (accounts) => {
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

  describe("constructor", () => {
    it("token address is set", async () => {
      let tokenAddress = await pool.token();
      assert.equal(tokenAddress, token.address);
    });
    it("delegation address is set", async () => {
      let delegationAddress = await pool.delegationAddress();
      assert.equal(delegationAddress, accounts[0]);
    });
  });

  describe("stake", () => {
    it("it is possible to stake tokens", async () => {
      let balance = await token.balanceOf(accounts[0]);
      await token.approve(pool.address, balance);
      await pool.stake(balance);
    });
    it("should revert if amount is zero", async () => {
      await expectRevert(pool.stake(0), "Amount must be greater than 0");
    });

    it("should revert if amount is not approved", async () => {
      let balance = await token.balanceOf(accounts[0]);
      await expectRevert(pool.stake(balance), "ERC20: insufficient allowance");
    });
  });

  describe("unsorted", () => {
    it("it is possible to withdraw tokens", async () => {
      let balance = await token.balanceOf(accounts[0]);
      await token.approve(pool.address, balance);
      await pool.stake(balance);
      await pool.withdraw(balance);
    });

    it("it is possible to exit", async () => {
      let balance = await token.balanceOf(accounts[0]);
      await token.approve(pool.address, balance);
      await pool.stake(balance);
      await expectRevert(pool.exit(), "You have no reward.");
    });

    it("it is possible to set the delegation address", async () => {
      await pool.setDelegationAddress(accounts[1]);
    });

    it("it is possible to notify the new rewards", async () => {
      let balance = await token.balanceOf(accounts[0]);
      await token.transfer(pool.address, balance);
      await pool.notifyRewardAmount();
    });

    it("it is possible to collect rewards", async () => {
      let balance = await token.balanceOf(accounts[0]);
      await token.approve(pool.address, balance.div(new BN(2)));
      await pool.stake(balance.div(new BN(2)));
      await token.transfer(pool.address, balance.div(new BN(2)));
      await pool.notifyRewardAmount();
      await time.increase(WEEK);
      await pool.getReward();
      let newBalance = await token.balanceOf(accounts[0]);
      assert(balance.div(new BN(2)).sub(newBalance) < new BN("1e9"));
    });

    it.skip("it is possible to set the new rewards duration", async () => {
      assert(true);
    });

    it.skip("it is possible to update reward", async () => {
      assert(true);
    });

    describe("template", () => {
      it.skip("template", async () => {});
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
});
