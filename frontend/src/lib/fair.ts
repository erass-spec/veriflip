import { encodePacked, keccak256 } from "viem";

/**
 * Off-chain mirror of CoinFlip's on-chain RNG. This is the heart of "provably fair":
 * anyone can recompute the result from public data and confirm the contract didn't cheat.
 *
 *   result = uint256(keccak256(abi.encodePacked(prevrandao, player, seed, nonce))) % 2
 */
export function recomputeResult(
  prevrandao: bigint,
  player: `0x${string}`,
  seed: `0x${string}`,
  nonce: bigint
): { hash: `0x${string}`; result: 0 | 1 } {
  const packed = encodePacked(
    ["uint256", "address", "bytes32", "uint256"],
    [prevrandao, player, seed, nonce]
  );
  const hash = keccak256(packed);
  const result = Number(BigInt(hash) % 2n) as 0 | 1;
  return { hash, result };
}

export const sideLabel = (s: number) => (s === 0 ? "Heads" : "Tails");
