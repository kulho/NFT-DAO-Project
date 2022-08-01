const GovernorContract = artifacts.require("GovernorContract");
const GovernanceTimeLock = artifacts.require("GovernanceTimeLock");
const Box = artifacts.require("Box");
const { time } = require("@openzeppelin/test-helpers");
const Epoch = artifacts.require("Epoch");
const GovernanceToken = artifacts.require("GovernanceToken");
const Pool = artifacts.require("IUniswapV3Pool");
const Treasury = artifacts.require("Treasury");
const StakingPool = artifacts.require("StakingPool");
const SwapRouter = artifacts.require("ISwapRouter");
const WETH9 = artifacts.require("IWETH9");

const NONFUNGIBLE_POSITION_MANAGER =
  "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";
const SWAP_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
const WETH = "0xc778417e063141139fce010982780140aa0cd5ab";
const UNISWAP_FACTORY_V3 = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
const POOL_FEE = 3000;

// Proposal
PROPOSAL_DESCRIPTION = "Proposal #1: Integration test";
NEW_STORE_VALUE = 5;
VOTING_DELAY = 10; /* 10 block */
// VOTING_PERIOD = 45818; /* 1 week */
VOTING_PERIOD = 20; /* testing purposes */
VOTE = 1; // 0 = Against, 1 = For, 2 = Abstain for this example
MIN_DELAY = 3600; // one hour

var BN = web3.utils.BN;
const ZERO = new BN(0);
const TWO = new BN(2);

contract("DAO integration test", (accounts) => {
  let governorContract,
    governanceTimeLock,
    token,
    nft,
    stakingPool,
    swapRouter,
    treasury,
    weth;

  const swapWeth2Token = async (swapRouter, value) => {
    let params, block, timestamp;

    block = await web3.eth.getBlock("latest");
    timestamp = block.timestamp + 1000;

    params = {
      tokenIn: WETH,
      tokenOut: token.address,
      fee: POOL_FEE,
      recipient: accounts[0],
      deadline: timestamp,
      amountIn: value,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
    };
    await swapRouter.exactInputSingle(params);
  };

  const swapToken2Weth = async (swapRouter, value) => {
    let params, block, timestamp;

    block = await web3.eth.getBlock("latest");
    timestamp = block.timestamp + 1000;

    params = {
      tokenIn: token.address,
      tokenOut: WETH,
      fee: POOL_FEE,
      recipient: accounts[0],
      deadline: timestamp,
      amountIn: value,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
    };
    await swapRouter.exactInputSingle(params);
  };

  beforeEach(async () => {
    nft = await Epoch.at("0xBAc959f049066b3F699D1FbBd62a755c55C19752");
    token = await GovernanceToken.deployed();
    governorContract = await GovernorContract.deployed();
    governanceTimeLock = await GovernanceTimeLock.deployed();
    stakingPool = await StakingPool.deployed();
    swapRouter = await SwapRouter.at(SWAP_ROUTER);
    treasury = await Treasury.deployed();
    weth = await WETH9.at(WETH);

    await time.advanceBlockTo(deployBlock.number + VOTING_DELAY);
  });

  it("emulate actual usage of the protocol", async () => {
    /*
    Test scenario:
    - claim some nfts
    - get tokens for nfts
    - stake token in staking pool
    - make trades in uniswap pool to generate fees
    - send some ether to the treasy to emulate gain of royalties
    - create and pass proposal to collect fees, then swap everything
      for token and approve to pool, notify rewards to the staking pool
    - make time pass and collect rewards from the staking pool
    */
    let balance, balanceAfter, balanceBefore, wethValue, tokenValue;

    // claim some nfts
    for (i = 0; i < 10; i++) {
      await nft.claimNFT({
        from: accounts[0],
        value: web3.utils.toWei("0.05", "ether"),
      });
    }

    // claim tokens from nfts
    balanceBefore = await token.balanceOf(accounts[0]);
    await token.claimTokenFromNfts({ from: accounts[0] });
    balanceAfter = await token.balanceOf(accounts[0]);
    assert(balanceAfter.sub(balanceBefore).gt(ZERO));

    // stake half of the tokens in the staking pool
    balance = balanceAfter.div(TWO);
    await token.approve(stakingPool.address, balance);
    await stakingPool.stake(balance);

    // make trades in the uniswap pool to accrue fees
    wethValue = web3.utils.toWei("2", "ether");
    await weth.deposit({ from: accounts[0], value: wethValue });

    for (i = 0; i < 50; i++) {
      wethValue = await weth.balanceOf(accounts[0]);
      await weth.approve(SWAP_ROUTER, wethValue, { from: accounts[0] });
      await swapWeth2Token(swapRouter, wethValue.toString());

      // assert weth was swapped
      tokenValue = await token.balanceOf(accounts[0]);

      // approve and swap tokens to weth
      await token.approve(SWAP_ROUTER, tokenValue, { from: accounts[0] });
      await swapToken2Weth(swapRouter, tokenValue.toString());
    }

    //
    //
    //
    //
    //
    //

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
