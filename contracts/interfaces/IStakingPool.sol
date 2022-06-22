// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface IStakingPool {
    /* Viewing functions */

    function totalSupply() external view returns (uint256);

    function balanceOf(address _account) external view returns (uint256);

    function lastTimeRewardApplicable() external view returns (uint256);

    function rewardPerToken() external view returns (uint256);

    function earned(address account) external view returns (uint256);

    /* State modifying functions */

    function stake(uint256 _amount) external;

    function withdraw(uint256 _amount) external;

    function getReward() external;

    function exit() external;

    /* Restricted functions */

    function setDelegationAddress(address _address) external;

    function notifyRewardAmount(uint256 reward) external;

    function setRewardsDuration(uint256 _rewardsDuration) external;
}
