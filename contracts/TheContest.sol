// SPDX-License-Identifier: MIT
pragma solidity 0.8.3;

import "usingtellor/contracts/UsingTellor.sol";
import "hardhat/console.sol";

interface IERC20 {
    function transfer(address _to, uint256 _amount) external returns(bool);
    function transferFrom(address _from, address _to, uint256 _amount) external returns(bool);
}

contract TheContest is UsingTellor {
    address public owner;
    uint256 public startDeadline;
    uint256 public endDeadline;
    uint256 public wager;
    IERC20 public token;
    uint256 public pot;
    uint256 public remainingCount;
    uint256 public reportingWindow = 2 days + 12 hours; 
    mapping(address => Member) public members;


    struct Member {
        bool approved;
        bool inTheRunning;
        bool claimedFunds;
    }

    constructor(
        address payable _tellor, 
        address _token, 
        uint256 _wager,
        uint256 _startDeadlineDays,
        uint256 _endDeadlineDays) 
        UsingTellor(_tellor) {
        startDeadline = block.timestamp + _startDeadlineDays * 1 days;
        endDeadline = startDeadline + _endDeadlineDays * 1 days;
        wager = _wager;
        token = IERC20(_token);
        owner = msg.sender;
    }

    function approveUsers(address[] calldata _users) public {
        require(msg.sender == owner, "Only owner can approve users");
        require(block.timestamp < startDeadline, "Contest has already started");
        for(uint256 _i = 0; _i<_users.length; _i++) {
            members[_users[_i]].approved = true;
        }
    }

    // STREAK-FREEZE - DOLLAR AUCTION MECHANISM? AND OTHER MECHANISM
    // TIMER AFTER NOTWEET, MORE STAKE LOST OVER TIME, IF FREEZE USED
    // PAY TO EXTEND WINDOW
    // NFT TO WINNERS
    // PAY TO NARROW OTHER PLAYER'S SUBMISSION WINDOW, OTHER PLAYER CAN PAY TO RE-EXTEND WINDOW
    // NFT USED TO BUY STREAK FREEZE
    // PAY TO ADD REQUIREMENTS TO ANOTHER PLAYER
    // COMPLICATED FORMULAS
    // PAY TO UNSTREAK
    // PERSON WITH LEAST ENGAGEMENT WITH CONTRACT ...
    // FIRST PERSON TO JOIN GET MORE OF SOMETING...
    // IF YOU UNSTREAK SOMEONE, AND THEY RESTREAK, YOU ARE NOW VULNERABLE
    // PAY TO EXTEND THE FINAL DEADLINE, ANYONE CAN DO THIS FOR A PRICE
    // IF YOU STAY AT THE TOP OF THE LEADERBOARD FOR A MONTH, YOU GET TO WITHDRAW
    // LOWEST ENGAGEMENT PERSON LOSES THEIR STAKE, IT GETS PUT IN SOME HIGH LEVERAGE POSITION
    // YOU CAN WALK AWAY WITH YOUR STAKE IF YOU FIND SOMEONE ELSE TO STAKE REPLACE YOU 


    function register() public {
        Member storage _member = members[msg.sender];
        require(_member.approved);
        require(token.transferFrom(msg.sender, address(this), wager));
        require(!_member.inTheRunning);
        require(block.timestamp < startDeadline);
        pot += wager;
        remainingCount++;
    }

    function claimLoser(address _user, uint256 _day) public {
        require((block.timestamp - startDeadline) > _day * 1 days + reportingWindow, "Reporting window has not passed");
        require(startDeadline + _day * 1 days < endDeadline, "_day is out of range");
        require(members[_user].inTheRunning, "User is not in the running");
        require(remainingCount > 1, "Only one user left");
        bytes memory _queryData = abi.encode("TwitterContest", abi.encode(_user, _day));
        bytes32 _queryId = keccak256(_queryData);
        (, uint256 _timestampRetrieved) = getDataBefore(_queryId, block.timestamp - 12 hours);
        require(_timestampRetrieved == 0);
        members[_user].inTheRunning = false;
    }

    function claimFunds() public {
        Member storage _member = members[msg.sender];
        require(_member.inTheRunning, "not a valid participant");
        require(!_member.claimedFunds, "funds already claimed");
        require(block.timestamp > endDeadline + reportingWindow + 12 hours || remainingCount == 1, "Game still active");
        _member.claimedFunds = true;
        token.transfer(msg.sender, pot / remainingCount);
    }

    // Getters
    function getMemberInfo(address _user) public view returns(Member memory) {
        return members[_user];
    }
}
