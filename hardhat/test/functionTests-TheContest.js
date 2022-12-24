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
  const queryData = abiCoder.encode(["string", "bytes"], ["TwitterContestV1", abiCoder.encode(["bytes"], ["0x"])]);
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
    // register one account
    await token.faucet(accounts[1].address)
    await token.connect(accounts[1]).approve(contest.address, WAGER + PROTOCOL_FEE)
    await contest.connect(accounts[1]).register("jjabramsdog")

    // try to claim loser with only one account
    await expect(contest.connect(accounts[1]).claimLoser(1)).to.be.revertedWith("Only one user left");

    // register two more accounts
    await token.faucet(accounts[2].address)
    await token.connect(accounts[2]).approve(contest.address, WAGER + PROTOCOL_FEE)
    await contest.connect(accounts[2]).register("bingo")
    await token.faucet(accounts[3].address)
    await token.connect(accounts[3]).approve(contest.address, WAGER + PROTOCOL_FEE)
    await contest.connect(accounts[3]).register("bongo")

    // try to claim loser before contest start
    await expect(contest.connect(accounts[1]).claimLoser(1)).to.be.revertedWith("Contest has not started");

    // try to claim loser when no oracle value has been submitted. Simulates invalid index input as well
    await h.advanceTime(START_DEADLINE_DAYS * 86400 + 1) // advance time past contest start
    await expect(contest.connect(accounts[1]).claimLoser(1)).to.be.revertedWith("No data found");

    // submitValue to tellor oracle signifying someone broke their tweeting streak
    let loserHandleAsBytes = abiCoder.encode(["string"], ["bongo"])
    // console.log("timestamp should be zero before submission", await tellor.getTimestampbyQueryIdandIndex(queryId, 0))
    await tellor.submitValue(queryId, loserHandleAsBytes, 0, queryData);
    // console.log("timestamp", await h.getBlock().timestamp)
    // console.log("timestamp from oracle submitted value", await tellor.getTimestampbyQueryIdandIndex(queryId, 0))
    // console.log("timestamp retrieved in contract", await contest.getTimestampShouldBeThere(0))

    console.log("query id from contest contract", await contest.getQueryId())

    // try to claim loser before oracle dispute period has elapsed
    let block = await h.getBlock()
    let blockTs = block.timestamp
    console.log("block timestamp", blockTs)
    await expect(contest.connect(accounts[1]).claimLoser(0)).to.be.revertedWith("Oracle dispute period has not passed");

    // successfully claim loser
    await h.advanceTime(12 * 3600 + 1) // advance time past oracle dispute period of 12 hours
    let memberInfoBefore = await contest.getMemberInfo(accounts[3].address)
    assert.equal(memberInfoBefore.inTheRunning, true, "member should be in the running");
    await contest.connect(accounts[1]).claimLoser(0)
    let memberInfo = await contest.getMemberInfo(accounts[3].address)
    assert.equal(memberInfo.inTheRunning, false, "inTheRunning not set correctly");

    // try to claim loser on account not "in the money"
    await expect(contest.connect(accounts[1]).claimLoser(0)).to.be.revertedWith("User is not in the running");

    // try to claim loser after contest has ended
    await h.advanceTime((END_DEADLINE_DAYS + 1) * 86400 + 1)
    await expect(contest.connect(accounts[1]).claimLoser(0)).to.be.revertedWith("Contest has ended");
  });

  it("claimFunds", async function() {
    // register three accounts
    await token.faucet(accounts[1].address)
    await token.connect(accounts[1]).approve(contest.address, WAGER + PROTOCOL_FEE)
    await contest.connect(accounts[1]).register("jjabramsdog")
    await token.faucet(accounts[2].address)
    await token.connect(accounts[2]).approve(contest.address, WAGER + PROTOCOL_FEE)
    await contest.connect(accounts[2]).register("bingo")
    await token.faucet(accounts[3].address)
    await token.connect(accounts[3]).approve(contest.address, WAGER + PROTOCOL_FEE)
    await contest.connect(accounts[3]).register("bongo")

    // claim loser on one participant
    await h.advanceTime(START_DEADLINE_DAYS * 86400 + 1) // advance time past contest start
    let loserHandleAsBytes = abiCoder.encode(["string"], ["bongo"])
    await tellor.submitValue(queryId, loserHandleAsBytes, 0, queryData);
    await h.advanceTime(12 * 3600 + 1) // advance time past oracle dispute period of 12 hours
    await contest.connect(accounts[1]).claimLoser(0)

    // try to claim funds as non-participant
    await expect(contest.connect(accounts[4]).claimFunds()).to.be.revertedWith("not a valid participant");

    // try to claim funds before contest has ended
    await expect(contest.connect(accounts[1]).claimFunds()).to.be.revertedWith("Game still active");

    // claim funds successfully
    // get balance before
    let balanceBefore = await token.balanceOf(accounts[1].address)
    await h.advanceTime((START_DEADLINE_DAYS + END_DEADLINE_DAYS) * 86400)
    await contest.connect(accounts[1]).claimFunds()
    let balanceAfter = await token.balanceOf(accounts[1].address)
    // balance should equal wager + half wager of user who broke their streak (bc divied up to the remaining 2 ppl)
    let expectedBalance = BigInt(WAGER) + BigInt(WAGER) / BigInt(2)
    assert.equal(balanceAfter - balanceBefore, expectedBalance, "balance not correct")
    
    // try to claim funds again
    await expect(contest.connect(accounts[1]).claimFunds()).to.be.revertedWith("funds already claimed");

    // last eligible participant claims funds successfully
    let balanceBefore2 = await token.balanceOf(accounts[2].address)
    await contest.connect(accounts[2]).claimFunds()
    let balanceAfter2 = await token.balanceOf(accounts[2].address)
    assert.equal(balanceAfter2 - balanceBefore2, expectedBalance, "balance 2 not correct")
  });
});