const GovernorContract = artifacts.require("GovernorContract");
const GovernanceToken = artifacts.require("GovernanceToken");
const GovernanceTimeLock = artifacts.require("GovernanceTimeLock");

ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

module.exports = async function (_, _, accounts) {
  governanceTimeLock = await GovernanceTimeLock.deployed();

  proposerRole = await governanceTimeLock.PROPOSER_ROLE();
  executorRole = await governanceTimeLock.EXECUTOR_ROLE();
  timelockAdminRole = await governanceTimeLock.TIMELOCK_ADMIN_ROLE();
  await governanceTimeLock.grantRole(proposerRole, GovernorContract.address, {
    from: accounts[0],
  });
  await governanceTimeLock.grantRole(executorRole, ADDRESS_ZERO, {
    from: accounts[0],
  });
  await governanceTimeLock.revokeRole(timelockAdminRole, accounts[0], {
    from: accounts[0],
  });
};
