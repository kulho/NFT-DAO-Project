const StakingPool = artifacts.require("StakingPool");
const GovernanceToken = artifacts.require("GovernanceToken");
const GovernanceTimeLock = artifacts.require("GovernanceTimeLock");

module.exports = async function (deployer, _, accounts) {
  let token = await GovernanceToken.deployed();

  await deployer.deploy(StakingPool, token.address, accounts[0]);
};
