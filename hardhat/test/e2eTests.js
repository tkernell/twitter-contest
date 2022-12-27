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

  it("realistic test", async function() {
    handle1 = "bob"
    handle2 = "alice"
    handle3 = "ricky"
    // fund accounts
    bob = accounts[1]
    alice = accounts[2]
    ricky = accounts[3]
    await token.faucet(bob.address)
    await token.faucet(alice.address)
    await token.faucet(ricky.address)
    await token.connect(bob).approve(contest.address, WAGER + PROTOCOL_FEE)
    await token.connect(alice).approve(contest.address, WAGER + PROTOCOL_FEE)
    await token.connect(ricky).approve(contest.address, WAGER + PROTOCOL_FEE)

    // register
    await contest.connect(bob).register(handle1)
    await contest.connect(alice).register(handle2)
    await contest.connect(ricky).register(handle3)

    // advance time to start deadline
    await h.advanceTime(START_DEADLINE_DAYS * 86400 + 1)

    // submit data
    rickyHandleBytes = abiCoder.encode(["string"], [handle3])
    await tellor.submitValue(queryId, rickyHandleBytes, 0, queryData)
    await h.advanceTime(86400)

    // claim loser
    await contest.claimLoser(0)

    await h.advanceTime(86400 * END_DEADLINE_DAYS)

    await contest.connect(alice).claimFunds()
    await contest.connect(bob).claimFunds()

    await contest.ownerClaim()
  });

 
});