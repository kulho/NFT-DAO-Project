const GovernorContract = artifacts.require("GovernorContract");
const GovernanceTimeLock = artifacts.require("GovernanceTimeLock");
const Box = artifacts.require("Box");
const { time } = require("@openzeppelin/test-helpers");
const { assertion } = require("@openzeppelin/test-helpers/src/expectRevert");

// Proposal
PROPOSAL_DESCRIPTION = "Proposal #1: Store 5 in the Box!";
NEW_STORE_VALUE = 5;
VOTING_DELAY = 10; /* 10 block */
// VOTING_PERIOD = 45818; /* 1 week */
VOTING_PERIOD = 20; /* testing purposes */
VOTE = 1; // 0 = Against, 1 = For, 2 = Abstain for this example
MIN_DELAY = 3600; // one hour

contract("DAO tests", (accounts) => {
  let box;
  let governorContract;
  let governanceTimeLock;
  beforeEach(async () => {
    governorContract = await GovernorContract.deployed();
    governanceTimeLock = await GovernanceTimeLock.deployed();
    box = await Box.deployed();
    const deployBlock = await web3.eth.getBlock("latest");
    await time.advanceBlockTo(deployBlock.number + VOTING_DELAY);
  });

  it("create and pass a proposal", async () => {
    encodedFunction = await box.contract.methods
      .store(NEW_STORE_VALUE)
      .encodeABI();

    proposeTX = await governorContract.propose(
      [box.address],
      [0],
      [encodedFunction],
      PROPOSAL_DESCRIPTION,
      { from: accounts[0] }
    );

    let proposalId = await proposeTX.receipt.logs[0].args.proposalId;

    let currentBlock = await web3.eth.getBlock("latest");

    await time.advanceBlockTo(currentBlock.number + VOTING_DELAY);

    await governorContract.castVoteWithReason(proposalId, VOTE, "Cuz I can", {
      from: accounts[0],
    });
    currentBlock = await web3.eth.getBlock("latest");
    await time.advanceBlockTo(currentBlock.number + VOTING_PERIOD);

    let descriptionHash = web3.utils.keccak256(PROPOSAL_DESCRIPTION);

    await governorContract.queue(
      [box.address],
      [0],
      [encodedFunction],
      descriptionHash,
      { from: accounts[0] }
    );

    await time.increase(MIN_DELAY);

    await governorContract.execute(
      [box.address],
      [0],
      [encodedFunction],
      descriptionHash,
      { from: accounts[0] }
    );

    newVal = await box.retrieve();

    assert.equal(NEW_STORE_VALUE, newVal);
  });
});
