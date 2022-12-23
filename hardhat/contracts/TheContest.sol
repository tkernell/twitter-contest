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
    uint256 public startDeadline; // when the contest starts
    uint256 public endDeadline;
    uint256 public wager; // contestant's initial stake
    IERC20 public token;
    uint256 public pot;
    uint256 public protocolFee;
    uint256 public remainingCount;
    uint256 public reportingWindow = 1 days; 
    
    mapping(address => Member) public members;
    mapping(string => address) public handleToAddress;

    struct Member {
        bool inTheRunning;
        bool claimedFunds;
        string handle;
    }

    constructor(
        address payable _tellor, 
        address _token, 
        uint256 _wager,
        uint256 _startDeadlineDays,
        uint256 _endDeadlineDays,
        uint256 _protocolFee)
        UsingTellor(_tellor) {
        startDeadline = block.timestamp + _startDeadlineDays * 1 days;
        endDeadline = startDeadline + _endDeadlineDays * 1 days;
        wager = _wager;
        token = IERC20(_token);
        owner = msg.sender;
        protocolFee = _protocolFee;
    }

    function register(string memory _handle) public {
        require(bytes(_handle).length > 0, "Handle cannot be empty");
        Member storage _member = members[msg.sender];
        require(token.transferFrom(msg.sender, address(this), wager+protocolFee), "Wager + fee transfer failed");
        require(!_member.inTheRunning, "Account already registered");
        require(block.timestamp < startDeadline, "Contest already started");
        require(handleToAddress[_handle] == address(0), "Handle already registered");
        pot += wager;
        remainingCount++;
        _member.handle = _handle;
        _member.inTheRunning = true;
        handleToAddress[_handle] = msg.sender;
    }

    function claimLoser(uint256 _index) public {
        require(remainingCount > 1, "Only one user left");
        require(block.timestamp > startDeadline, "Contest has not started");
        require(block.timestamp < endDeadline + reportingWindow, "Contest has ended");
        // Could query id be hardcoded above so it doesn't have to be generated every time this function is called?
        bytes memory _queryData = abi.encode("TwitterContestV1", abi.encode(bytes("")));
        bytes32 _queryId = keccak256(_queryData);
        uint256 _timestampRetrieved = getTimestampbyQueryIdandIndex(_queryId, _index);
        require(_timestampRetrieved > 0, "No data found");
        require(_timestampRetrieved > block.timestamp - 12 hours, "Oracle dispute period has not passed");
        bytes memory _valueRetrieved = retrieveData(_queryId, _timestampRetrieved);
        string memory _handle = abi.decode(_valueRetrieved, (string));
        address _user = handleToAddress[_handle];
        require(members[_user].inTheRunning, "User is not in the running");
        members[_user].inTheRunning = false;
        remainingCount--;
    }

    function getTimestampShouldBeThere(uint256 _index) public view returns(uint256) {
        bytes memory _queryData = abi.encode("TwitterContestV1", abi.encode(bytes("")));
        bytes32 _queryId = keccak256(_queryData);
        return getTimestampbyQueryIdandIndex(_queryId, _index);
    }

    function getQueryId() public view returns(bytes32) {
        bytes memory _queryData = abi.encode("TwitterContestV1", abi.encode(bytes("")));
        return keccak256(_queryData);
    }

    function claimFunds() public {
        Member storage _member = members[msg.sender];
        require(_member.inTheRunning, "not a valid participant");
        require(!_member.claimedFunds, "funds already claimed");
        // Wouddn't the OR condition result in a bug if the contest was over, but there was only one participant left who'd kept their streak?
        require(block.timestamp > endDeadline + reportingWindow || remainingCount == 1, "Game still active");
        _member.claimedFunds = true;
        token.transfer(msg.sender, pot / remainingCount);
    }

    // Getters
    function getMemberInfo(address _user) public view returns(Member memory) {
        return members[_user];
    }
}
