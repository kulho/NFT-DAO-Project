const Epoch = artifacts.require("Epoch");
const Token = artifacts.require("GovernanceToken");
const { expectRevert } = require("@openzeppelin/test-helpers");

contract("Governance token tests", (accounts) => {
  let token, nft;

  beforeEach(async () => {
    token = await Token.deployed();
    nft = await Epoch.at("0xBAc959f049066b3F699D1FbBd62a755c55C19752");
  });

  // restart ganache before rerunning otherwise Epoch will remember minted nfts
  it("it should not be possible to claim tokens without nft", async () => {
    await expectRevert(
      token.claimTokenFromNfts({ from: accounts[0] }),
      "You must own Epoch NFT to claim token"
    );
  });

  it("it is possible to claim nft", async () => {
    await nft.claimNFT({
      from: accounts[0],
      value: web3.utils.toWei("0.05", "ether"),
    });
  });

  it("it is possible to claim tokens for the nft", async () => {
    await token.claimTokenFromNfts({ from: accounts[0] });
  });

  it("it should not be possible to claim token from the same nft twice", async () => {
    await expectRevert(
      token.claimTokenFromNfts({ from: accounts[0] }),
      "All of your NFTs have already been claimed."
    );
  });

  it("the reward rate per nft should be 10 (* 10 ** 18)", async () => {
    let balanceBefore = await token.balanceOf(accounts[0]);
    await nft.claimNFT({
      from: accounts[0],
      value: web3.utils.toWei("0.05", "ether"),
    });
    await token.claimTokenFromNfts({ from: accounts[0] });
    let balanceAfter = await token.balanceOf(accounts[0]);
    let balance = balanceAfter - balanceBefore;
    assert.equal(balance, web3.utils.toWei("10", "ether").toString());
  });

  it("it is possible to receive reward for multiple nfts", async () => {
    let balanceBefore = await token.balanceOf(accounts[0]);
    await nft.claimNFT({
      from: accounts[0],
      value: web3.utils.toWei("0.05", "ether"),
    });
    await nft.claimNFT({
      from: accounts[0],
      value: web3.utils.toWei("0.05", "ether"),
    });
    await nft.claimNFT({
      from: accounts[0],
      value: web3.utils.toWei("0.05", "ether"),
    });
    await token.claimTokenFromNfts({ from: accounts[0] });
    let balanceAfter = await token.balanceOf(accounts[0]);
    let balance = balanceAfter - balanceBefore;
    assert.equal(balance, web3.utils.toWei("30", "ether").toString());
  });

  it("Final check for no overclaiming per nft", async () => {
    await expectRevert(
      token.claimTokenFromNfts({ from: accounts[0] }),
      "All of your NFTs have already been claimed."
    );
  });
});
