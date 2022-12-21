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
    bob = accounts[1]
    alice = accounts[2]
    ricky = accounts[3]
    console.log("balance acct 0:", await token.balanceOf(bob.address))
    await token.faucet(bob.address)
    await token.faucet(alice.address)
    console.log("balance acct 0:", await token.balanceOf(bob.address))

    // try to register with no twitter handle included
    await expect(contest.connect(bob).register("")).to.be.revertedWith("Handle cannot be empty");
  
    // try to register with insufficient funds

    // register successfully
    balanceBefore = await token.balanceOf(bob.address)
    await contest.connect(bob).register("jjabramsdog")
    balanceAfter = await token.balanceOf(bob.address)
    memberInfo = await contest.getMemberInfo(bob.address)
    assert.equal(memberInfo.handle, "jjabramsdog", "twitter handle not set correctly");
    // check wager and protocol fee deducted
    console.log("balanceBefore:", balanceBefore)
    console.log("balanceAfter:", balanceAfter)



    // try to register with same account
    await expect(contest.connect(bob).register("bingo")).to.be.revertedWith("Account already registered");
    // try to register with same twitter handle
    await expect(contest.connect(alice).register("jjabramsdog")).to.be.revertedWith("Handle already registered");

    // try to register after start deadline
    await h.advanceTime(START_DEADLINE_DAYS * 86400 + 1)
    await expect(contest.connect(ricky).register("bongo")).to.be.revertedWith("Contest already started");
  });

  it("claimLoser", async function() {

  });

  it("claimFunds", async function() {

  });

});