// Read a seal back off X Layer. The anchor tx carries the keccak256 seal in its
// calldata (a 0-value self-send), so anyone can pull it and recompute-compare.
import { createPublicClient, http, type Hex } from "viem";
import { xlayerTestnet } from "@/lib/chain/xlayer";

/** The calldata (= the anchored seal hash) of an X Layer anchor tx, or null. */
export async function getAnchoredHash(txHash: Hex): Promise<string | null> {
  try {
    const client = createPublicClient({ chain: xlayerTestnet, transport: http() });
    const tx = await client.getTransaction({ hash: txHash });
    return tx.input && tx.input !== "0x" ? tx.input : null;
  } catch {
    return null; // unknown tx / RPC issue - treat as "not confirmable", don't throw
  }
}
