// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CoinFlip
 * @notice A custodial, on-chain coin-flip game with a transparent, RECOMPUTABLE outcome.
 *
 * @dev Game loop:  deposit() -> flip() -> withdraw()
 *
 *      Randomness is derived in a single transaction from:
 *          keccak256(block.prevrandao, player, playerSeed, nonce) % 2
 *      Every input is either public on-chain data (prevrandao) or emitted in the
 *      `BetSettled` event (player, seed, nonce, result). Anyone can recompute the
 *      result from the event alone and confirm the contract did not cheat.
 *
 *      HONEST LIMITATION: block.prevrandao is set by the block proposer. A validator
 *      who produces the block CAN influence/withhold it, so this is "verifiable" and
 *      "recomputable", NOT "manipulation-proof". For production, swap to Chainlink VRF
 *      or a commit-reveal scheme. See docs/security_review.md.
 *
 *      House edge: 3.5% on a fair 50/50 coin. A winning bet pays 1.93x (BPS 19300).
 *      EV(player) = 0.5 * 0.93b - 0.5 * b = -0.035b.
 */
contract CoinFlip is Ownable, ReentrancyGuard {
    // --- Constants ---------------------------------------------------------

    /// @notice Winning payout multiplier in basis points. 19300 = 1.93x.
    uint256 public constant PAYOUT_BPS = 19_300;
    uint256 public constant BPS_DENOMINATOR = 10_000;

    enum Side {
        Heads, // 0
        Tails // 1
    }

    // --- Storage -----------------------------------------------------------

    /// @notice Withdrawable balance per player (deposits + winnings - bets).
    mapping(address => uint256) public balances;

    /// @notice Monotonic per-player counter mixed into the randomness preimage.
    mapping(address => uint256) public nonces;

    /// @notice Owner-funded liquidity used to pay out winning profit.
    uint256 public houseBankroll;

    uint256 public minBet = 0.001 ether;
    uint256 public maxBet = 1 ether;

    /// @notice Total number of settled flips (also serves as a global game id).
    uint256 public totalFlips;

    // --- Events ------------------------------------------------------------

    /// @notice One rich event per flip — powers BOTH the recent-games feed and the
    ///         provably-fair verification panel. Recompute:
    ///         result = uint256(keccak256(abi.encodePacked(prevrandao, player, seed, nonce))) % 2
    event BetSettled(
        uint256 indexed gameId,
        address indexed player,
        uint256 betAmount,
        Side choice,
        Side result,
        bool won,
        uint256 payout,
        uint256 prevrandao,
        bytes32 seed,
        uint256 nonce
    );

    event Deposited(address indexed player, uint256 amount, uint256 newBalance);
    event Withdrawn(address indexed player, uint256 amount, uint256 newBalance);
    event HouseFunded(uint256 amount, uint256 newBankroll);
    event HouseWithdrawn(uint256 amount, uint256 newBankroll);
    event BetLimitsUpdated(uint256 minBet, uint256 maxBet);

    // --- Errors ------------------------------------------------------------

    error ZeroAmount();
    error BetOutOfRange(uint256 sent, uint256 min, uint256 max);
    error InsufficientBalance(uint256 have, uint256 need);
    error InsufficientBankroll(uint256 have, uint256 need);
    error TransferFailed();
    error InvalidLimits();

    constructor() Ownable(msg.sender) {}

    // --- Player: banking ---------------------------------------------------

    /// @notice Deposit ETH into your withdrawable game balance.
    function deposit() external payable {
        if (msg.value == 0) revert ZeroAmount();
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value, balances[msg.sender]);
    }

    /// @notice Withdraw from your game balance. Checks-effects-interactions + guard.
    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        uint256 bal = balances[msg.sender];
        if (bal < amount) revert InsufficientBalance(bal, amount);

        balances[msg.sender] = bal - amount; // effects first
        emit Withdrawn(msg.sender, amount, balances[msg.sender]);

        (bool ok, ) = msg.sender.call{value: amount}(""); // interaction last
        if (!ok) revert TransferFailed();
    }

    // --- Player: gameplay --------------------------------------------------

    /**
     * @notice Place a coin-flip bet from your game balance.
     * @param choice  Heads (0) or Tails (1).
     * @param seed    A player-chosen seed mixed into the randomness preimage. Lets the
     *                player contribute entropy and verify they did so.
     * @param betAmount Amount to wager (must be within [minBet, maxBet] and <= balance).
     */
    function flip(Side choice, bytes32 seed, uint256 betAmount)
        external
        nonReentrant
        returns (bool won, uint256 payout)
    {
        if (betAmount < minBet || betAmount > maxBet) {
            revert BetOutOfRange(betAmount, minBet, maxBet);
        }
        uint256 bal = balances[msg.sender];
        if (bal < betAmount) revert InsufficientBalance(bal, betAmount);

        // Liquidity guard: the house must be able to cover the maximum profit BEFORE
        // we accept the bet, so a winner can always be paid.
        uint256 maxPayout = (betAmount * PAYOUT_BPS) / BPS_DENOMINATOR;
        uint256 maxProfit = maxPayout - betAmount;
        if (houseBankroll < maxProfit) {
            revert InsufficientBankroll(houseBankroll, maxProfit);
        }

        // --- Effects: take the bet up front ---
        uint256 nonce = nonces[msg.sender];
        balances[msg.sender] = bal - betAmount;

        // --- Resolve outcome (recomputable) ---
        uint256 prevrandao = block.prevrandao;
        Side result = Side(
            uint256(keccak256(abi.encodePacked(prevrandao, msg.sender, seed, nonce))) % 2
        );
        won = (result == choice);

        if (won) {
            payout = maxPayout;
            uint256 profit = maxProfit;
            houseBankroll -= profit;
            balances[msg.sender] += payout; // bet already deducted -> net +profit
        } else {
            payout = 0;
            houseBankroll += betAmount; // house keeps the lost bet
        }

        uint256 gameId = totalFlips;
        unchecked {
            totalFlips = gameId + 1;
            nonces[msg.sender] = nonce + 1;
        }

        emit BetSettled(gameId, msg.sender, betAmount, choice, result, won, payout, prevrandao, seed, nonce);
    }

    // --- Owner: house liquidity --------------------------------------------

    function fundHouse() external payable onlyOwner {
        if (msg.value == 0) revert ZeroAmount();
        houseBankroll += msg.value;
        emit HouseFunded(msg.value, houseBankroll);
    }

    function withdrawHouse(uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (houseBankroll < amount) revert InsufficientBankroll(houseBankroll, amount);

        houseBankroll -= amount; // effects first
        emit HouseWithdrawn(amount, houseBankroll);

        (bool ok, ) = owner().call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    function setBetLimits(uint256 _minBet, uint256 _maxBet) external onlyOwner {
        if (_minBet == 0 || _maxBet < _minBet) revert InvalidLimits();
        minBet = _minBet;
        maxBet = _maxBet;
        emit BetLimitsUpdated(_minBet, _maxBet);
    }

    // --- Views -------------------------------------------------------------

    /// @notice Profit (1.93x payout minus stake) a winning bet of `betAmount` yields.
    function previewPayout(uint256 betAmount) external pure returns (uint256 payout) {
        return (betAmount * PAYOUT_BPS) / BPS_DENOMINATOR;
    }

    /// @notice Off-chain recomputation helper — mirrors the in-contract derivation.
    function computeResult(uint256 prevrandao, address player, bytes32 seed, uint256 nonce)
        external
        pure
        returns (Side)
    {
        return Side(uint256(keccak256(abi.encodePacked(prevrandao, player, seed, nonce))) % 2);
    }

    function getBalance(address player) external view returns (uint256) {
        return balances[player];
    }

    /// @notice Total ETH held by the contract (player balances + house bankroll).
    function totalLiquidity() external view returns (uint256) {
        return address(this).balance;
    }
}
