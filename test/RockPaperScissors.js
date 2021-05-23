const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RockPaperScissors", () => {
  let rockpaperscissors;
  let mockCoin;
  let owner, addr1, addr2;
  beforeEach(async () => {
    const MockCoin = await ethers.getContractFactory("MockCoin");
    [owner, addr1, addr2] = await ethers.getSigners();
    mockCoin = await MockCoin.deploy();
    await mockCoin.deployed();
    coinAddress = mockCoin.address;
    const RockPaperScissors = await ethers.getContractFactory("RockPaperScissors");
    rockpaperscissors = await RockPaperScissors.deploy(mockCoin.address);
    await rockpaperscissors.deployed();
    await mockCoin.mint(100);
  })

  describe("Enrollment", () => {
    it("A user should be able to enroll", async () => {
      await mockCoin.approve(rockpaperscissors.address, 1);
      await rockpaperscissors.enroll()
      expect(await mockCoin.balanceOf(owner.address)).to.equal(99);
      expect(await mockCoin.balanceOf(rockpaperscissors.address)).to.equal(1);
    });
  
    it("Enrollment should fail w/o token approval", async () => {
      await expect(rockpaperscissors.enroll()).to.be.revertedWith("Not enough allowance to enroll.")
      expect(await mockCoin.balanceOf(owner.address)).to.equal(100);
      expect(await mockCoin.balanceOf(rockpaperscissors.address)).to.equal(0);
    })
  })

  describe("Move Submission", () => {
    it("A user should be able to submit a move after enrolling", async () => {
      await mockCoin.approve(rockpaperscissors.address, 1);
      await rockpaperscissors.enroll();
      await expect(rockpaperscissors.submitMove("R", false)).to.not.be.reverted;
    })

    it("A user should be able to submit a move w/opponent after enrolling", async () => {
      await mockCoin.approve(rockpaperscissors.address, 1);
      await rockpaperscissors.enroll();
      await expect(rockpaperscissors.submitMoveWithOpponent("R", false, addr1.address)).to.not.be.reverted;
    })

    it("A user should not be able to submit an invalid move", async () => {
      await mockCoin.approve(rockpaperscissors.address, 1);
      await rockpaperscissors.enroll();
      await expect(rockpaperscissors.submitMove("Q", false)).to.be.revertedWith("Move must be R (Rock), P (Paper) or S (Scissors).");
    })

    it("A user should not be able to submit a move w/o having a balance in the contract", async () => {
      await expect(rockpaperscissors.submitMove("R", false)).to.be.revertedWith("You don't have any funds to use!");
    })

    it("A user should not be able to submit a move if the room is full", async () => {
      await mockCoin.connect(addr1).mint(100);
      await mockCoin.connect(addr2).mint(100);
      await mockCoin.approve(rockpaperscissors.address, 1);
      await mockCoin.connect(addr1).approve(rockpaperscissors.address, 1);
      await mockCoin.connect(addr2).approve(rockpaperscissors.address, 1);
      await rockpaperscissors.enroll();
      await rockpaperscissors.connect(addr1).enroll();
      await rockpaperscissors.connect(addr2).enroll();
      await rockpaperscissors.submitMove("R", false);
      await rockpaperscissors.connect(addr1).submitMove("P", false);
      await expect(rockpaperscissors.connect(addr2).submitMove("R", false)).to.be.revertedWith("The room is currently full");
    })

    it("A user should not be able to submit a move if they've already made a move", async () => {
      await mockCoin.approve(rockpaperscissors.address, 1);
      await rockpaperscissors.enroll();
      await rockpaperscissors.submitMove("P", false);
      await expect(rockpaperscissors.submitMove("P", false)).to.be.revertedWith("You're already in a game!");
    })

    it("A user should not be able to submit a move w/opponent if room is full", async () => {
      await mockCoin.connect(addr1).mint(100);
      await mockCoin.connect(addr2).mint(100);
      await mockCoin.approve(rockpaperscissors.address, 1);
      await mockCoin.connect(addr1).approve(rockpaperscissors.address, 1);
      await mockCoin.connect(addr2).approve(rockpaperscissors.address, 1);
      await rockpaperscissors.enroll();
      await rockpaperscissors.connect(addr1).enroll();
      await rockpaperscissors.connect(addr2).enroll();
      await rockpaperscissors.submitMoveWithOpponent("R", false, addr1.address);
      await rockpaperscissors.connect(addr1).submitMoveWithOpponent("P", false, owner.address);
      await expect(rockpaperscissors.connect(addr2).submitMoveWithOpponent("S", false, addr1.address)).to.be.revertedWith("Your opponent is already in a game");
    })

    it("A user should not be able to submit a move w/opponent if they've already made a move", async () => {
      await mockCoin.approve(rockpaperscissors.address, 1);
      await rockpaperscissors.enroll();
      await rockpaperscissors.submitMoveWithOpponent("P", false, addr1.address);
      await expect (rockpaperscissors.submitMoveWithOpponent("S", false, addr1.address)).to.be.revertedWith("You're already in a game!");
    })

  })

  describe("Finish Game", () => {

    it("A user should be able to finish a game and collect winnings", async () => {
      await mockCoin.connect(addr1).mint(100);  
      await mockCoin.approve(rockpaperscissors.address, 1);
      await mockCoin.connect(addr1).approve(rockpaperscissors.address, 1);
      await rockpaperscissors.enroll();
      await rockpaperscissors.connect(addr1).enroll();
      await rockpaperscissors.submitMove("R", false);
      await rockpaperscissors.connect(addr1).submitMove("S", false);
      await expect(rockpaperscissors.finishGame()).to.not.be.reverted;
      expect(await rockpaperscissors.balanceOf(owner.address)).to.equal(0);
      expect(await rockpaperscissors.balanceOf(addr1.address)).to.equal(0);
      expect(await mockCoin.balanceOf(owner.address)).to.equal(101);
      expect(await mockCoin.balanceOf(addr1.address)).to.equal(99);
    })

    it("A user should be able to finish a game w/opponent and collect winnings", async () => {
      await mockCoin.connect(addr1).mint(100);
      await mockCoin.approve(rockpaperscissors.address, 1);
      await mockCoin.connect(addr1).approve(rockpaperscissors.address, 1);
      await rockpaperscissors.enroll();
      await rockpaperscissors.connect(addr1).enroll();
      await rockpaperscissors.submitMoveWithOpponent("R", false, addr1.address);
      await rockpaperscissors.connect(addr1).submitMoveWithOpponent("S", false, owner.address);
      await expect(rockpaperscissors.finishGameWithOpponent()).to.not.be.reverted;
      expect(await rockpaperscissors.balanceOf(owner.address)).to.equal(0);
      expect(await rockpaperscissors.balanceOf(addr1.address)).to.equal(0);
      expect(await mockCoin.balanceOf(owner.address)).to.equal(101);
      expect(await mockCoin.balanceOf(addr1.address)).to.equal(99);
    })

    it("A user should be able to finish a game and rollover winnings", async () => {
      await mockCoin.connect(addr1).mint(100);  
      await mockCoin.approve(rockpaperscissors.address, 1);
      await mockCoin.connect(addr1).approve(rockpaperscissors.address, 1);
      await rockpaperscissors.enroll();
      await rockpaperscissors.connect(addr1).enroll();
      await rockpaperscissors.submitMove("R", true);
      await rockpaperscissors.connect(addr1).submitMove("S", true);
      await expect(rockpaperscissors.finishGame()).to.not.be.reverted;
      expect(await rockpaperscissors.balanceOf(owner.address)).to.equal(2);
      expect(await rockpaperscissors.balanceOf(addr1.address)).to.equal(0);
      expect(await mockCoin.balanceOf(owner.address)).to.equal(99);
      expect(await mockCoin.balanceOf(addr1.address)).to.equal(99);
    })

    it("A user should be able to finish a game w/opponent and rollover winnings", async () => {
      await mockCoin.connect(addr1).mint(100);
      await mockCoin.approve(rockpaperscissors.address, 1);
      await mockCoin.connect(addr1).approve(rockpaperscissors.address, 1);
      await rockpaperscissors.enroll();
      await rockpaperscissors.connect(addr1).enroll();
      await rockpaperscissors.submitMoveWithOpponent("R", true, addr1.address);
      await rockpaperscissors.connect(addr1).submitMoveWithOpponent("S", true, owner.address);
      await expect(rockpaperscissors.finishGameWithOpponent()).to.not.be.reverted;
      expect(await rockpaperscissors.balanceOf(owner.address)).to.equal(2);
      expect(await rockpaperscissors.balanceOf(addr1.address)).to.equal(0);
      expect(await mockCoin.balanceOf(owner.address)).to.equal(99);
      expect(await mockCoin.balanceOf(addr1.address)).to.equal(99);
    })

    it("A user should not be able to call finishGame if they are not a participant", async () => {
      await mockCoin.connect(addr1).mint(100);  
      await mockCoin.approve(rockpaperscissors.address, 1);
      await mockCoin.connect(addr1).approve(rockpaperscissors.address, 1);
      await rockpaperscissors.enroll();
      await rockpaperscissors.connect(addr1).enroll();
      await rockpaperscissors.submitMove("R", false);
      await rockpaperscissors.connect(addr1).submitMove("S", false);
      await expect(rockpaperscissors.connect(addr2).finishGame()).to.be.revertedWith("You are not a participant.");
    })

    it("A user should not be able to call finishGameWithOpponent if they are not a participant", async () => {
      await mockCoin.connect(addr1).mint(100);
      await mockCoin.approve(rockpaperscissors.address, 1);
      await mockCoin.connect(addr1).approve(rockpaperscissors.address, 1);
      await rockpaperscissors.enroll();
      await rockpaperscissors.connect(addr1).enroll();
      await rockpaperscissors.submitMoveWithOpponent("R", false, addr1.address);
      await rockpaperscissors.connect(addr1).submitMoveWithOpponent("S", false, owner.address);
      await expect(rockpaperscissors.connect(addr2).finishGameWithOpponent()).to.be.revertedWith("You are not a participant.");
    })

    it("A user should not be able to call finish game if one side hasn't made a move", async () => {
      await mockCoin.connect(addr1).mint(100);
      await mockCoin.approve(rockpaperscissors.address, 1);
      await mockCoin.connect(addr1).approve(rockpaperscissors.address, 1);
      await rockpaperscissors.enroll();
      await rockpaperscissors.connect(addr1).enroll();
      await rockpaperscissors.submitMove("R", false);
      await expect(rockpaperscissors.finishGame()).to.be.revertedWith("Both players must make a choice before computing winner");
    })

    it("A user should not be able to call finish game w/opponent if one side hasn't made a move", async () => {
      await mockCoin.connect(addr1).mint(100);
      await mockCoin.approve(rockpaperscissors.address, 1);
      await mockCoin.connect(addr1).approve(rockpaperscissors.address, 1);
      await rockpaperscissors.enroll();
      await rockpaperscissors.connect(addr1).enroll();
      await rockpaperscissors.submitMoveWithOpponent("R", false, addr1.address);
      await expect(rockpaperscissors.finishGameWithOpponent()).to.be.revertedWith("Both players must make a choice before computing winner");
    })

  })

  describe("Unlock Funds", () => {
    
    it("A user should be able to call unlockFunds after 3 days if opponent hasn't made a move", async () => {
      await mockCoin.approve(rockpaperscissors.address, 1);
      await rockpaperscissors.enroll();
      await rockpaperscissors.submitMove("R", false);
      await ethers.provider.send('evm_increaseTime', [3600 * 24 * 3]);
      await ethers.provider.send('evm_mine');
      await expect(rockpaperscissors.unlockFunds()).to.not.be.reverted;
      expect(await mockCoin.balanceOf(owner.address)).to.be.equal(100);
      expect(await rockpaperscissors.balanceOf(owner.address)).to.be.equal(0);
    })

    it("A user should be able to unlockFunds and have their enrollment rollover", async () => {
      await mockCoin.approve(rockpaperscissors.address, 1);
      await rockpaperscissors.enroll();
      await rockpaperscissors.submitMove("R", true);
      await ethers.provider.send('evm_increaseTime', [3600 * 24 * 3]);
      await ethers.provider.send('evm_mine');
      await expect(rockpaperscissors.unlockFunds()).to.not.be.reverted;
      expect(await mockCoin.balanceOf(owner.address)).to.be.equal(99);
      expect(await rockpaperscissors.balanceOf(owner.address)).to.be.equal(1);
    })

    it("A user should be able to unlockFundsWithOpponent after 3 days if opponent hasn't made a move", async () => {
      await mockCoin.approve(rockpaperscissors.address, 1);
      await rockpaperscissors.enroll();
      await rockpaperscissors.submitMoveWithOpponent("R", false, addr1.address);
      await ethers.provider.send('evm_increaseTime', [3600 * 24 * 3]);
      await ethers.provider.send('evm_mine');
      await expect(rockpaperscissors.unlockFundsWithOpponent()).to.not.be.reverted;
      expect(await mockCoin.balanceOf(owner.address)).to.be.equal(100);
      expect(await rockpaperscissors.balanceOf(owner.address)).to.be.equal(0);
    })

    it("A user should be able to unlockFundsWithOpponent after 3 days and rollover enrollment", async () => {
      await mockCoin.approve(rockpaperscissors.address, 1);
      await rockpaperscissors.enroll();
      await rockpaperscissors.submitMoveWithOpponent("R", true, addr1.address);
      await ethers.provider.send('evm_increaseTime', [3600 * 24 * 3]);
      await ethers.provider.send('evm_mine');
      await expect(rockpaperscissors.unlockFundsWithOpponent()).to.not.be.reverted;
      expect(await mockCoin.balanceOf(owner.address)).to.be.equal(99);
      expect(await rockpaperscissors.balanceOf(owner.address)).to.be.equal(1);
    })

    it("A user should not be able to unlockFunds if they aren't in a game", async () => {
      await expect(rockpaperscissors.unlockFunds()).to.be.revertedWith("You're currently not in a game...");
    })

    it("A user should not be able to unlockFundsWithOpponent if they aren't in a game", async () => {
      await expect(rockpaperscissors.unlockFundsWithOpponent()).to.be.revertedWith("You're currently not in a game...");
    })

    it("A user should not be able to unlockFunds for a completed game", async () => {
      await mockCoin.connect(addr1).mint(100);
      await mockCoin.approve(rockpaperscissors.address, 1);
      await mockCoin.connect(addr1).approve(rockpaperscissors.address, 1);
      await rockpaperscissors.enroll();
      await rockpaperscissors.connect(addr1).enroll();
      await rockpaperscissors.submitMove("R", false);
      await rockpaperscissors.connect(addr1).submitMove("S", false);
      await expect(rockpaperscissors.unlockFunds()).to.be.revertedWith("You can't revert a completed game!");
    })

    it("A user should not be able to unlockFundsWithOpponent for a completed game", async () => {
      await mockCoin.connect(addr1).mint(100);
      await mockCoin.approve(rockpaperscissors.address, 1);
      await mockCoin.connect(addr1).approve(rockpaperscissors.address, 1);
      await rockpaperscissors.enroll();
      await rockpaperscissors.connect(addr1).enroll();
      await rockpaperscissors.submitMoveWithOpponent("R", false, addr1.address);
      await rockpaperscissors.connect(addr1).submitMoveWithOpponent("S", false, owner.address);
      await expect(rockpaperscissors.unlockFundsWithOpponent()).to.be.revertedWith("You can't revert a completed game!");
    })

    it("A user should not be able to unlockFunds if it's been less than 3 days", async () => {
      await mockCoin.approve(rockpaperscissors.address, 1);
      await rockpaperscissors.enroll();
      await rockpaperscissors.submitMove("R", false);
      await ethers.provider.send('evm_increaseTime', [3600 * 24 * 2]);
      await ethers.provider.send('evm_mine');
      await expect(rockpaperscissors.unlockFunds()).to.be.revertedWith("Must wait atleast 3 days before unlocking.")
    })

    it("A user should not be able to unlockFundsWithOpponent if it's been less than 3 days", async () => {
      await mockCoin.approve(rockpaperscissors.address, 1);
      await rockpaperscissors.enroll();
      await rockpaperscissors.submitMoveWithOpponent("R", false, addr1.address);
      await ethers.provider.send('evm_increaseTime', [3600 * 24 * 2]);
      await ethers.provider.send('evm_mine');
      await expect(rockpaperscissors.unlockFundsWithOpponent()).to.be.revertedWith("Must wait atleast 3 days before unlocking.")
    })

  })

  describe("Retrieve Balance", () => {
    it("A user should be able to retrieve an amount from their balance", async () => {
      await mockCoin.approve(rockpaperscissors.address, 1);
      await rockpaperscissors.enroll();
      await rockpaperscissors.retrieveFromBalance(1);
      expect(await mockCoin.balanceOf(owner.address)).to.equal(100);
      expect(await rockpaperscissors.balanceOf(owner.address)).to.equal(0);
    })

    it("A user cannot retrieve an amount from their balance while in a game", async () => {
      await mockCoin.approve(rockpaperscissors.address, 1);
      await rockpaperscissors.enroll();
      await rockpaperscissors.submitMove("R", false);
      await expect(rockpaperscissors.retrieveFromBalance(1)).to.be.revertedWith("You cannot retrieve funds while in a game.")
    })

    it("A user cannot retrieve an amount from their balance while in a game w/opponent", async () => {
      await mockCoin.approve(rockpaperscissors.address, 1);
      await rockpaperscissors.enroll();
      await rockpaperscissors.submitMoveWithOpponent("R", false, addr1.address);
      await expect(rockpaperscissors.retrieveFromBalance(1)).to.be.revertedWith("You cannot retrieve funds while in a game.")
    })

    it("A user cannot retrieve an amount more than what they have in their balance", async () => {
      await mockCoin.approve(rockpaperscissors.address, 1);
      await rockpaperscissors.enroll();
      await expect(rockpaperscissors.retrieveFromBalance(2)).to.be.revertedWith("You have less than the requested amount in your balance.")
    })


  })


  
});
