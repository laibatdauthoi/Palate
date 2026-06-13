import { app_config } from "@/config/app_config";
import type { ActiveMatch, BuffAssignment, ClaimRecord, MediaRecord, PalateBalance, UserSummary, WaitingPush } from "@/types/palate";

function notImplemented(functionName: string): never {
  throw new Error(`${functionName} is not implemented. Future work should use Aptos ${app_config.networkLabel} view calls or signed entry-function transactions.`);
}

// Future Aptos view call boundary: read registered media from Palate contract state.
export async function getUserMedia(_walletAddress: string): Promise<MediaRecord[]> {
  void _walletAddress;
  notImplemented("getUserMedia");
}

// Future Aptos view call boundary: read waiting pushes from Palate contract state.
export async function getWaitingPushes(): Promise<WaitingPush[]> {
  notImplemented("getWaitingPushes");
}

// Future Aptos view call boundary: read active matches from Palate contract state.
export async function getActiveMatches(): Promise<ActiveMatch[]> {
  notImplemented("getActiveMatches");
}

// Future Aptos view call boundary: read current assignment for a wallet.
export async function getCurrentAssignment(_walletAddress: string): Promise<BuffAssignment | null> {
  void _walletAddress;
  notImplemented("getCurrentAssignment");
}

// Future Aptos view call boundary: read Palate Balance from contract state.
export async function getPalateBalance(_walletAddress: string): Promise<PalateBalance> {
  void _walletAddress;
  notImplemented("getPalateBalance");
}

// Future Aptos view call boundary: read claim helpers and claim state.
export async function getClaimRecords(_walletAddress: string): Promise<ClaimRecord[]> {
  void _walletAddress;
  notImplemented("getClaimRecords");
}

// Future Aptos view call boundary: read user_summary.
export async function getUserSummary(_walletAddress: string): Promise<UserSummary> {
  void _walletAddress;
  notImplemented("getUserSummary");
}

// Future signed entry-function boundary. Do not submit real transactions in Task F3.
export async function submitPalateTransaction(_functionName: string, _args: unknown[]): Promise<never> {
  void _functionName;
  void _args;
  notImplemented("submitPalateTransaction");
}
