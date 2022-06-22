// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface IEpoch {
    function tokenOfOwnerByIndex(address owner, uint256 index)
        external
        view
        returns (uint256);

    function balanceOf(address owner) external view returns (uint256);
}
