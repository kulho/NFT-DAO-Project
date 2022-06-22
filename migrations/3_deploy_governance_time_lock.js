const GovernanceTimeLock = artifacts.require("GovernanceTimeLock");

MIN_DELAY = 3600; // one hour

module.exports = function (deployer) {
  deployer.deploy(GovernanceTimeLock, MIN_DELAY, [], []);
};
