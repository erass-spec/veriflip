const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const PAYOUT_BPS = 19_300n;
const BPS = 10_000n;
const HEADS = 0;
const TAILS = 1;

// Off-chain mirror of the contract's RNG. If these ever disagree, "provably fair" is a lie.
function recompute(prevrandao, player, seed, nonce) {
  const hash = ethers.solidityPackedKeccak256(
    ["uint256", "address", "bytes32", "uint256"],
    [prevrandao, player, seed, nonce]
  );
  return Number(BigInt(hash) % 2n); // 0 = Heads, 1 = Tails
}

describe("CoinFlip", function () {
  async function deploy() {
    const [owner, player, other] = await ethers.getSigners();
    const CoinFlip = await ethers.getContractFactory("CoinFlip");
    const coinflip = await CoinFlip.deploy();
    await coinflip.waitForDeployment();
    return { coinflip, owner, player, other };
  }

  async function funded() {
    const ctx = await deploy();
    // Owner funds the house and player deposits.
    await ctx.coinflip.connect(ctx.owner).fundHouse({ value: ethers.parseEther("50") });
    await ctx.coinflip.connect(ctx.player).deposit({ value: ethers.parseEther("10") });
    return ctx;
  }

  describe("deployment", function () {
    it("sets owner and sane defaults", async function () {
      const { coinflip, owner } = await loadFixture(deploy);
      expect(await coinflip.owner()).to.equal(owner.address);
      expect(await coinflip.minBet()).to.equal(ethers.parseEther("0.001"));
      expect(await coinflip.maxBet()).to.equal(ethers.parseEther("1"));
      expect(await coinflip.PAYOUT_BPS()).to.equal(PAYOUT_BPS);
    });
  });

  describe("deposit / withdraw", function () {
    it("credits deposits and emits", async function () {
      const { coinflip, player } = await loadFixture(deploy);
      await expect(coinflip.connect(player).deposit({ value: ethers.parseEther("2") }))
        .to.emit(coinflip, "Deposited")
        .withArgs(player.address, ethers.parseEther("2"), ethers.parseEther("2"));
      expect(await coinflip.getBalance(player.address)).to.equal(ethers.parseEther("2"));
    });

    it("rejects zero-value deposit", async function () {
      const { coinflip, player } = await loadFixture(deploy);
      await expect(coinflip.connect(player).deposit({ value: 0 })).to.be.revertedWithCustomError(
        coinflip,
        "ZeroAmount"
      );
    });

    it("withdraws and moves real ETH", async function () {
      const { coinflip, player } = await loadFixture(funded);
      const before = await ethers.provider.getBalance(player.address);
      const tx = await coinflip.connect(player).withdraw(ethers.parseEther("4"));
      const rc = await tx.wait();
      const gas = rc.gasUsed * rc.gasPrice;
      const after = await ethers.provider.getBalance(player.address);
      expect(after).to.equal(before + ethers.parseEther("4") - gas);
      expect(await coinflip.getBalance(player.address)).to.equal(ethers.parseEther("6"));
    });

    it("reverts withdrawing more than balance", async function () {
      const { coinflip, player } = await loadFixture(funded);
      await expect(
        coinflip.connect(player).withdraw(ethers.parseEther("999"))
      ).to.be.revertedWithCustomError(coinflip, "InsufficientBalance");
    });

    it("reverts zero withdraw", async function () {
      const { coinflip, player } = await loadFixture(funded);
      await expect(coinflip.connect(player).withdraw(0)).to.be.revertedWithCustomError(
        coinflip,
        "ZeroAmount"
      );
    });
  });

  describe("house liquidity", function () {
    it("only owner can fund / withdraw house", async function () {
      const { coinflip, player } = await loadFixture(deploy);
      await expect(
        coinflip.connect(player).fundHouse({ value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(coinflip, "OwnableUnauthorizedAccount");
      await expect(
        coinflip.connect(player).withdrawHouse(1)
      ).to.be.revertedWithCustomError(coinflip, "OwnableUnauthorizedAccount");
    });

    it("tracks bankroll on fund and withdraw", async function () {
      const { coinflip, owner } = await loadFixture(deploy);
      await coinflip.connect(owner).fundHouse({ value: ethers.parseEther("5") });
      expect(await coinflip.houseBankroll()).to.equal(ethers.parseEther("5"));
      await coinflip.connect(owner).withdrawHouse(ethers.parseEther("2"));
      expect(await coinflip.houseBankroll()).to.equal(ethers.parseEther("3"));
    });

    it("reverts house withdraw beyond bankroll", async function () {
      const { coinflip, owner } = await loadFixture(deploy);
      await expect(
        coinflip.connect(owner).withdrawHouse(1)
      ).to.be.revertedWithCustomError(coinflip, "InsufficientBankroll");
    });
  });

  describe("bet limits", function () {
    it("owner can update; rejects invalid", async function () {
      const { coinflip, owner, player } = await loadFixture(funded);
      await coinflip.connect(owner).setBetLimits(ethers.parseEther("0.01"), ethers.parseEther("2"));
      expect(await coinflip.minBet()).to.equal(ethers.parseEther("0.01"));
      await expect(
        coinflip.connect(owner).setBetLimits(0, 1)
      ).to.be.revertedWithCustomError(coinflip, "InvalidLimits");
      await expect(
        coinflip.connect(player).setBetLimits(1, 2)
      ).to.be.revertedWithCustomError(coinflip, "OwnableUnauthorizedAccount");
    });

    it("rejects bets out of range", async function () {
      const { coinflip, player } = await loadFixture(funded);
      const seed = ethers.id("x");
      await expect(
        coinflip.connect(player).flip(HEADS, seed, ethers.parseEther("0.0001"))
      ).to.be.revertedWithCustomError(coinflip, "BetOutOfRange");
      await expect(
        coinflip.connect(player).flip(HEADS, seed, ethers.parseEther("5"))
      ).to.be.revertedWithCustomError(coinflip, "BetOutOfRange");
    });

    it("rejects bet exceeding balance", async function () {
      const { coinflip, other } = await loadFixture(funded);
      const seed = ethers.id("x");
      await expect(
        coinflip.connect(other).flip(HEADS, seed, ethers.parseEther("0.5"))
      ).to.be.revertedWithCustomError(coinflip, "InsufficientBalance");
    });
  });

  describe("flip: liquidity guard", function () {
    it("rejects a bet the bankroll cannot cover", async function () {
      const { coinflip, player } = await loadFixture(deploy);
      // Player has balance but house has no bankroll.
      await coinflip.connect(player).deposit({ value: ethers.parseEther("1") });
      await expect(
        coinflip.connect(player).flip(HEADS, ethers.id("s"), ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(coinflip, "InsufficientBankroll");
    });
  });

  describe("flip: provable fairness + accounting", function () {
    it("contract result always matches off-chain recomputation, and accounting is exact for BOTH outcomes", async function () {
      const { coinflip, player } = await loadFixture(funded);
      const bet = ethers.parseEther("0.1");
      const payout = (bet * PAYOUT_BPS) / BPS;
      const profit = payout - bet;

      let sawWin = false;
      let sawLoss = false;

      // Deterministic on a fresh Hardhat network: fixed seeds -> reproducible outcomes.
      for (let i = 0; i < 40 && !(sawWin && sawLoss); i++) {
        const choice = i % 2; // alternate heads/tails
        const seed = ethers.id("seed-" + i);
        const nonce = await coinflip.nonces(player.address);
        const balBefore = await coinflip.getBalance(player.address);
        const bankBefore = await coinflip.houseBankroll();

        const tx = await coinflip.connect(player).flip(choice, seed, bet);
        const rc = await tx.wait();

        const ev = rc.logs
          .map((l) => coinflip.interface.parseLog(l))
          .find((p) => p && p.name === "BetSettled");
        expect(ev, "BetSettled emitted").to.not.equal(undefined);

        const { result, won, prevrandao } = ev.args;

        // 1) Provable fairness: independent recomputation must match the contract.
        const expected = recompute(prevrandao, player.address, seed, nonce);
        expect(Number(result)).to.equal(expected);
        expect(won).to.equal(Number(result) === Number(choice));

        // 2) The public view helper must agree too.
        const viaView = await coinflip.computeResult(prevrandao, player.address, seed, nonce);
        expect(Number(viaView)).to.equal(expected);

        // 3) Exact accounting per branch.
        const balAfter = await coinflip.getBalance(player.address);
        const bankAfter = await coinflip.houseBankroll();
        if (won) {
          sawWin = true;
          expect(balAfter).to.equal(balBefore + profit);
          expect(bankAfter).to.equal(bankBefore - profit);
          expect(ev.args.payout).to.equal(payout);
        } else {
          sawLoss = true;
          expect(balAfter).to.equal(balBefore - bet);
          expect(bankAfter).to.equal(bankBefore + bet);
          expect(ev.args.payout).to.equal(0n);
        }
      }

      expect(sawWin, "observed at least one win").to.equal(true);
      expect(sawLoss, "observed at least one loss").to.equal(true);
    });

    it("increments nonce and totalFlips", async function () {
      const { coinflip, player } = await loadFixture(funded);
      expect(await coinflip.totalFlips()).to.equal(0n);
      await coinflip.connect(player).flip(HEADS, ethers.id("a"), ethers.parseEther("0.05"));
      await coinflip.connect(player).flip(TAILS, ethers.id("b"), ethers.parseEther("0.05"));
      expect(await coinflip.totalFlips()).to.equal(2n);
      expect(await coinflip.nonces(player.address)).to.equal(2n);
    });

    it("previewPayout returns 1.93x", async function () {
      const { coinflip } = await loadFixture(deploy);
      expect(await coinflip.previewPayout(ethers.parseEther("1"))).to.equal(
        ethers.parseEther("1.93")
      );
    });
  });
});
