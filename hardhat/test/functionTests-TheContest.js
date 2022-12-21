const {expect,assert} = require("chai");
const {ethers} = require("hardhat");
const h = require("./helpers/helpers");
const web3 = require("web3");
const {keccak256} = require("@ethersproject/keccak256");
const { abi, bytecode } = require("usingtellor/artifacts/contracts/TellorPlayground.sol/TellorPlayground.json")

describe("TheContest - Function tests", function() {
  let tellor;
  let token;
  let contest;
  let accounts;
  const abiCoder = new ethers.utils.AbiCoder;
  const START_DEADLINE_DAYS = 1;
  const END_DEADLINE_DAYS = 100;
  const PROTOCOL_FEE = h.toWei("10")
  const WAGER = h.toWei("500")
  const queryData = abiCoder.encode(["string", "bytes"], ["TwitterContestV1", ethers.utils.toUtf8Bytes("")]);
  const queryId = keccak256(queryData);
  console.log("queryId:", queryId)
  console.log("queryData:", queryData)
  

  beforeEach(async function() {
    accounts = await ethers.getSigners();
    const TellorPlayground = await ethers.getContractFactory(abi, bytecode);
    tellor = await TellorPlayground.deploy();
    await tellor.deployed();
    token = await TellorPlayground.deploy();
    await token.deployed();
    const Contest = await ethers.getContractFactory("TheContest");
    contest = await Contest.deploy(tellor.address, token.address, WAGER, START_DEADLINE_DAYS, END_DEADLINE_DAYS, PROTOCOL_FEE);
    await contest.deployed();
  });

  it("constructor", async function() {
    blocky0 = await h.getBlock()
    tellorAddressRetrieved = await contest.tellor()
    assert.equal(tellorAddressRetrieved, tellor.address, "tellor address not set correctly");
    assert.equal(await contest.startDeadline(), START_DEADLINE_DAYS * 86400 + blocky0.timestamp, "start deadline not set correctly");
    assert.equal(await contest.endDeadline(), (START_DEADLINE_DAYS + END_DEADLINE_DAYS) * 86400 + blocky0.timestamp, "end deadline not set correctly");
    assert.equal(await contest.protocolFee(), PROTOCOL_FEE, "protocol fee not set correctly");
    assert.equal(await contest.wager(), WAGER, "wager not set correctly");
  });

  it("register", async function() {
    handle1 = "jjabramsdog"
    handle2 = "bingo"
    handle3 = "bongo"
    // fund accounts
    bob = accounts[1]
    alice = accounts[2]
    ricky = accounts[3]
    await token.faucet(bob.address)
    await token.faucet(bob.address)
    await token.faucet(alice.address)
    await token.faucet(ricky.address)

    // try to register with no twitter handle included
    await expect(contest.connect(bob).register("")).to.be.revertedWith("Handle cannot be empty");

    // register successfully
    balanceBefore = await token.balanceOf(bob.address)
    await token.connect(bob).approve(contest.address, WAGER + PROTOCOL_FEE)
    await contest.connect(bob).register(handle1)
    balanceAfter = await token.balanceOf(bob.address)
    memberInfo = await contest.getMemberInfo(bob.address)
    assert.equal(memberInfo.handle, handle1, "twitter handle not set correctly");
    assert.equal(memberInfo.inTheRunning, true, "inTheRunning not set correctly");
    assert.equal(memberInfo.claimedFunds, false, "claimedFunds not set correctly");
    assert.equal(balanceBefore - balanceAfter, BigInt(WAGER) + BigInt(PROTOCOL_FEE), "wager and protocol fee not deducted correctly");
    assert.equal(await contest.remainingCount(), 1, "remainingCount not incremented");
    assert.equal(await contest.pot(), WAGER, "pot not correct");
    assert.equal(await contest.handleToAddress(handle1), bob.address, "handle not mapped to address");

    // try to register with same account
    await token.connect(bob).approve(contest.address, WAGER + PROTOCOL_FEE)
    await expect(contest.connect(bob).register(handle2)).to.be.revertedWith("Account already registered");
    // try to register with same twitter handle
    await token.connect(alice).approve(contest.address, WAGER + PROTOCOL_FEE)
    await expect(contest.connect(alice).register(handle1)).to.be.revertedWith("Handle already registered");

    // try to register after start deadline
    await h.advanceTime(START_DEADLINE_DAYS * 86400 + 1)
    await token.connect(ricky).approve(contest.address, WAGER + PROTOCOL_FEE)
    await expect(contest.connect(ricky).register(handle3)).to.be.revertedWith("Contest already started");
  });

  it("claimLoser", async function() {

  });

  it("claimFunds", async function() {

  });

});