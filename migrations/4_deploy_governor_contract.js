const GovernorContract = artifacts.require("GovernorContract");
const GovernanceToken = artifacts.require("GovernanceToken");
const GovernanceTimeLock = artifacts.require("GovernanceTimeLock");

QUORUM = 5; /* 5% */
VOTING_DELAY = 10; /* 10 block */
// VOTING_PERIOD = 45818; /* 1 week */
VOTING_PERIOD = 20; /* testing purposes */

module.exports = async function (deployer) {
  governanceToken = await GovernanceToken.deployed();
  governanceTimeLock = await GovernanceTimeLock.deployed();
  await deployer.deploy(
    GovernorContract,
    governanceToken.address,
    governanceTimeLock.address,
    QUORUM,
    VOTING_DELAY,
    VOTING_PERIOD
  );
};
