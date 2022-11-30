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
  

  beforeEach(async function() {
    accounts = await ethers.getSigners();
    const TellorPlayground = await ethers.getContractFactory(abi, bytecode);
    tellor = await TellorPlayground.deploy();
    await tellor.deployed();
    token = await TellorPlayground.deploy();
    await token.deployed();
    const Contest = await ethers.getContractFactory("TheContest");
    contest = await Contest.deploy(tellor.address, token.address, h.toWei("500"), START_DEADLINE_DAYS, END_DEADLINE_DAYS, PROTOCOL_FEE);
    await contest.deployed();
  });

  it("constructor", async function() {
    blocky0 = await h.getBlock()
    tellorAddressRetrieved = await contest.tellor()
    assert.equal(tellorAddressRetrieved, tellor.address, "tellor address not set correctly");
    assert.equal(await contest.startDeadline(), START_DEADLINE_DAYS * 86400 + blocky0.timestamp, "start deadline not set correctly");
  });

  it("register", async function() {
    
  });

});