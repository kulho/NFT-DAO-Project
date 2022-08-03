const Pool = artifacts.require("StakingPool");
const Token = artifacts.require("GovernanceToken");
const { expectRevert, BN } = require("@openzeppelin/test-helpers");
const { time } = require("@openzeppelin/test-helpers");
const { web3 } = require("@openzeppelin/test-helpers/src/setup");

EPOCH_ADDRESS = "0xBAc959f049066b3F699D1FbBd62a755c55C19752";
NAME = "GovernanceToken";
SYMBOL = "GTK";
INITIAL_POOL_PRICE = 2000;
INITIAL_ETH_LIQUIDITY = 5;
REWARD_RATE = 10;
WEEK = 604800;
GWEI_BN = new BN(1000000000);

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
    pool.setTreasuryAddress(accounts[0]);
  });

  describe("constructor", () => {
    it("token address is set", async () => {
      let tokenAddress = await pool.token();
      assert.equal(tokenAddress, token.address);
    });
    it("delegation address is set", async () => {
      let delegationAddress = await pool.delegationAddress();
      assert.equal(delegationAddress, accounts[0]);

      let tokenDelegationAddress = await token.delegates(pool.address);
      assert.equal(tokenDelegationAddress, accounts[0]);
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

  describe("witdraw", () => {
    it("it is possible to withdraw all tokens", async () => {
      let balance = await token.balanceOf(accounts[0]);
      await token.approve(pool.address, balance);
      await pool.stake(balance);
      await pool.withdraw(balance);
      let newBalance = await token.balanceOf(accounts[0]);
      assert.equal(balance.toString(), newBalance.toString());
    });

    it("it is possible to withdraw arbitrary number tokens", async () => {
      let balance = await token.balanceOf(accounts[0]);
      await token.approve(pool.address, balance);
      await pool.stake(balance);
      await pool.withdraw(balance.div(new BN(2)));
      let newBalance = await token.balanceOf(accounts[0]);
      assert.equal(balance.div(new BN(2)).toString(), newBalance.toString());
    });

    it("should revert if amount is zero", async () => {
      await expectRevert(pool.withdraw(0), "Cannot withdraw 0 tokens");
    });

    it("should revert if trying to withdraw more than staked", async () => {
      let balance = await token.balanceOf(accounts[0]);
      await token.approve(pool.address, balance);
      await pool.stake(balance);
      await expectRevert(
        pool.withdraw(balance + 1),
        "Cannot withdraw more than you have"
      );
    });
  });

  describe("getReward", () => {
    it("it is possible to collect rewards", async () => {
      let balance = await token.balanceOf(accounts[0]);
      await token.approve(pool.address, balance.div(new BN(2)));
      await pool.stake(balance.div(new BN(2)));
      await token.approve(pool.address, balance.div(new BN(2)));
      await pool.notifyReward();
      await time.increase(WEEK);
      await pool.getReward();
      let newBalance = await token.balanceOf(accounts[0]);
      assert(balance.div(new BN(2)).sub(newBalance).lt(GWEI_BN));
    });

    it("should not receive any reward if zero", async () => {
      let balance = await token.balanceOf(accounts[0]);
      await token.approve(pool.address, balance);
      await pool.notifyReward();

      await time.increase(WEEK);
      await pool.getReward();
      let newBalance = await token.balanceOf(accounts[0]);
      assert(newBalance.eq(new BN(0)));
    });
  });

  describe("exit", () => {
    it("it is possible to exit", async () => {
      let balance = await token.balanceOf(accounts[0]);
      await token.approve(pool.address, balance.div(new BN(2)));
      await pool.stake(balance.div(new BN(2)));
      await token.approve(pool.address, balance.div(new BN(2)));
      await pool.notifyReward();
      await time.increase(WEEK);
      await pool.exit();
      let newBalance = await token.balanceOf(accounts[0]);
      assert(balance.div(new BN(2)).sub(newBalance).lt(GWEI_BN));
    });

    it("it is possible to exit even without reward", async () => {
      let balance = await token.balanceOf(accounts[0]);
      await token.approve(pool.address, balance);
      await pool.stake(balance);
      await pool.exit();
      let newBalance = await token.balanceOf(accounts[0]);
      assert.equal(balance.toString(), newBalance.toString());
    });

    it("should revert if no tokens were staked", async () => {
      await expectRevert(pool.exit(), "Cannot withdraw 0 tokens");
    });
  });

  describe("setDelegationAddress", () => {
    it("should revert if not called by the owner", async () => {
      await expectRevert(
        pool.setDelegationAddress(accounts[1], { from: accounts[1] }),
        "Ownable: caller is not the owner"
      );
    });

    it("it is possible to set the delegation address", async () => {
      await pool.setDelegationAddress(accounts[1]);
      let delegationAddress = await pool.delegationAddress();
      assert.equal(delegationAddress, accounts[1]);

      let tokenDelegationAddress = await token.delegates(pool.address);
      assert.equal(tokenDelegationAddress, accounts[1]);
    });
  });

  describe("setTreasuryAddress", () => {
    it("should revert if not called by the owner", async () => {
      await expectRevert(
        pool.setTreasuryAddress(accounts[1], { from: accounts[1] }),
        "Ownable: caller is not the owner"
      );
    });

    it("it is possible to set the treasury address", async () => {
      await pool.setTreasuryAddress(accounts[1]);
      let treasuryAddress = await pool.treasuryAddress();
      assert.equal(treasuryAddress, accounts[1]);
    });
  });

  describe("notifyReward", () => {
    it("it is possible to notify the new rewards", async () => {
      let balance = await token.balanceOf(accounts[0]);
      await token.approve(pool.address, balance);
      await pool.notifyReward();
    });

    it("should revert if not called by the owner", async () => {
      let balance = await token.balanceOf(accounts[0]);
      await token.approve(pool.address, balance);
      await expectRevert(
        pool.notifyReward({ from: accounts[1] }),
        "Ownable: caller is not the owner"
      );
    });

    it("should revert if not all tokens were approved to the pool", async () => {
      let balance = await token.balanceOf(accounts[0]);
      await token.approve(pool.address, balance.div(new BN(2)));
      await expectRevert(pool.notifyReward(), "STF");
    });

    it("should revert reward is null", async () => {
      await expectRevert(pool.notifyReward(), "Reward must not be null");
    });

    it("it is possible to update the reward", async () => {
      let balance = await token.balanceOf(accounts[0]);
      await token.approve(pool.address, balance.div(new BN(2)));
      await token.transfer(accounts[1], balance.div(new BN(2)), {
        from: accounts[0],
      });
      await pool.notifyReward();
      let rewardBefore = await pool.rewardRate();
      await token.transfer(accounts[0], balance.div(new BN(2)), {
        from: accounts[1],
      });
      await token.approve(pool.address, balance.div(new BN(2)));
      await pool.notifyReward();
      let rewardAfter = await pool.rewardRate();
      assert(rewardBefore.lt(rewardAfter));
    });
  });

  describe("setRewardsDuration", () => {
    it("should revert if not called by the owner", async () => {
      await expectRevert(
        pool.setRewardsDuration(10, { from: accounts[1] }),
        "Ownable: caller is not the owner"
      );
    });

    it("it is possible to set a new duration", async () => {
      await pool.setRewardsDuration(10);
      let rewardsDuration = await pool.rewardsDuration();
      assert.equal(rewardsDuration, 10);
    });

    it("should revert if the period did not finish yet", async () => {
      let balance = await token.balanceOf(accounts[0]);
      await token.approve(pool.address, balance);
      await pool.notifyReward();
      await expectRevert(
        pool.setRewardsDuration(10),
        "Previous rewards period must be complete before changing the duration for the new period"
      );
    });
  });

  describe("integration test", () => {
    it("verify math adds up over multiple rewards", async () => {
      let balance, balanceBefore, newBalance, i, random, value;
      balanceBefore = await token.balanceOf(accounts[0]);
      await token.approve(pool.address, balanceBefore.div(new BN(2)));
      await pool.stake(balanceBefore.div(new BN(2)));
      for (i = 0; i < 50; i++) {
        random = new BN(web3.utils.randomHex(1).toString().slice(2));
        if (random.eq(new BN(0))) random = new BN(1);
        if (i != 0)
          await token.transfer(accounts[0], balance.sub(value), {
            from: accounts[1],
          });
        balance = await token.balanceOf(accounts[0]);
        value = balance.mul(random).div(new BN(256));
        await token.transfer(accounts[1], balance.sub(value));
        await token.approve(pool.address, value);
        await pool.notifyReward();
        await time.increase(WEEK / 2);
        await pool.getReward({ gas: 30000000 });
      }
      await token.transfer(accounts[0], balance.sub(value), {
        from: accounts[1],
      });
      await time.increase(WEEK);
      await pool.getReward({ gas: 30000000 });
      newBalance = await token.balanceOf(accounts[0]);
      assert(balanceBefore.div(new BN(2)).sub(newBalance).lt(GWEI_BN));
    });
  });
});
