const Epoch = artifacts.require("Epoch");

contract("Epoch NFT test", (accounts) => {
  it("get log", () => {
    let sqrt = Math.sqrt(0.0005);
    let x96 = web3.utils.toBN("2e96");
    let sqrtp = web3.utils.toBN(sqrt);
    let sqrtpx96 = sqrtp.times(x96);
    console.log(sqrtpx96);
    console.log("test");
  });
});

0.0223606797749978969640917366873127623544061835961152572427089724541052092563780489941441440837878227;

79228162514264337593543950336;

1771595571142957102961017161.60726;
