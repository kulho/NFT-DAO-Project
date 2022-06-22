const Epoch = artifacts.require("Epoch");

contract("Epoch NFT test", accounts =>{
    const [deployerAddress, tokenAddress] = accounts;
    const _fundsReceiver = "0x07B952aA5AF52fe56D5129c0a0acB0c1B32d9e32";
    const _baseURL = "ipfs://QmdYKXeajvdN64U5bsrtyyanwFL6x5z4yHwzm3ki25mLLN/";
    const _newOwner = "0x07B952aA5AF52fe56D5129c0a0acB0c1B32d9e32"


    it("its possible to set receiver address", async () =>{
        let token = await Epoch.deployed();
        await token.setFundsReceiver(_fundsReceiver);
        let new_address = await token.getFundsReceiver();
        assert.equal(new_address, _fundsReceiver);
    });

    it("its possible to set the baseURI", async () => {
        let token = await Epoch.deployed();
        await token.setBaseURI(_baseURL);
    });

    it("its possible to claim NFTs", async () => {
        let token = await Epoch.deployed();
        await token.claimNFT({value: web3.utils.toWei('0.05', 'ether')});
        let totalSupply = await token.totalSupply();
        assert.equal(totalSupply, '1');
    });

    it("royalties are set correctly", async () => {
        let token = await Epoch.deployed();
        let raribleRoyalties = await token.getRaribleV2Royalties(1);
        let royaltyInfo = await token.royaltyInfo(1,10000);
        // rarible and mintable royalty receiver is the same
        assert.equal(raribleRoyalties[0][0], royaltyInfo['0']);
        // receiver is the same as set before
        assert.equal(raribleRoyalties[0][0], _fundsReceiver);
        // rarible and mintable royalties are the same
        assert.equal(raribleRoyalties[0][1], royaltyInfo['1']['words'][0]);
        // royalties are set to 5%
        assert.equal(raribleRoyalties[0][1], 500);
    });

    it("funds from claiming are transfered to receiver", async () => {
        let token = await Epoch.deployed();
        let balance_before = await web3.eth.getBalance(_fundsReceiver);
        let new_balance = parseInt(balance_before) + parseInt(web3.utils.toWei('0.05', 'ether'));
        await token.claimNFT({value: web3.utils.toWei('0.05', 'ether')});
        let balance_after = await web3.eth.getBalance(_fundsReceiver);
        assert.equal(new_balance, balance_after);
    });

    it("it should not be possible to claim NFT with less than 0.05 eth - error should be catched", async () => {
        let token = await Epoch.deployed();
        try {
            await token.claimNFT({value: web3.utils.toWei('0.02', 'ether')});
            console.log("No error catched");
            assert.equal(1,2);
        } catch (error) {
            console.log("Catched error: " + error.reason);
            assert.equal(error.reason, "Send the correct redeem price - 0.05eth");
        };
    });

    it("it should not be possible to claim NFT with more than 0.05 eth - error should be catched", async () => {
        let token = await Epoch.deployed();
        try {
            await token.claimNFT({value: web3.utils.toWei('0.06', 'ether')});
            console.log("No error catched");
            assert.equal(1,2);
        } catch (error) {
            console.log("Catched error: " + error.reason);
            assert.equal(error.reason, "Send the correct redeem price - 0.05eth");
        };
    });

    it("it should not be possible to claim NFT without any eth - error should be catched", async () => {
        let token = await Epoch.deployed();
        try {
            await token.claimNFT();
            console.log("No error catched");
            assert.equal(1,2);
        } catch (error) {
            console.log("Catched error: " + error.reason);
            assert.equal(error.reason, "Send the correct redeem price - 0.05eth");
        };
    });

    it("its possible to mint all 6400 NFTs", async () => {
        let token = await Epoch.deployed();
        await web3.eth.sendTransaction({to: accounts[0], value: web3.utils.toWei('99','ether'), from: accounts[9]});
        await web3.eth.sendTransaction({to: accounts[0], value: web3.utils.toWei('99','ether'), from: accounts[8]});
        await web3.eth.sendTransaction({to: accounts[0], value: web3.utils.toWei('99','ether'), from: accounts[7]});
        for (let i = 0; i < 6398; i++){
            await token.claimNFT({value: web3.utils.toWei('0.05', 'ether')});
        }
    });

    it("it should not be possible to mint more NFTs - error should be catched", async () => {
        let token = await Epoch.deployed();
        try {
            let Tid = await token.claimNFT({value: web3.utils.toWei('0.05', 'ether')});
            console.log(Tid);
            console.log("No error catched");
            assert.equal(1,2);
        } catch (error) {
            console.log("Catched error: " + error.reason);
            assert.equal(error.reason, "Cannot claim any more NFTs");
        };
    });

    it("its possible to change the owner", async () => {
        let token = await Epoch.deployed();
        await token.transferOwnership(_newOwner);
        let new_owner = await token.owner();
        assert.equal(new_owner, _newOwner);
    });

})