const Epoch = artifacts.require("Epoch");

module.exports = async function (deployer) {
  let epoch = await Epoch.at("0xBAc959f049066b3F699D1FbBd62a755c55C19752");
};
