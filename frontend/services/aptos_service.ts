import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import type { SimpleEntryFunctionArgumentTypes } from "@aptos-labs/ts-sdk";
import { app_config } from "@/config/app_config";
import type {
  ActiveMatch,
  BuffAssignment,
  ChainCategoryConstants,
  ChainProtocolConfig,
  ClaimRecord,
  MediaRecord,
  PalateBalance,
  UserSummary,
  WaitingPush
} from "@/types/palate";

const aptos_config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(aptos_config);

const module_id = `${app_config.moduleAddress}::${app_config.moduleName}`;

function notImplemented(functionName: string): never {
  throw new Error(`${functionName} is not implemented. Future work should use Aptos ${app_config.networkLabel} view calls or signed entry-function transactions.`);
}

function viewFunction(functionName: string) {
  return `${module_id}::${functionName}` as `${string}::${string}::${string}`;
}

async function viewOne<T>(functionName: string, functionArguments: SimpleEntryFunctionArgumentTypes[] = []): Promise<T> {
  const result = await aptos.view<[T]>({
    payload: {
      function: viewFunction(functionName),
      typeArguments: [],
      functionArguments
    }
  });

  return result[0];
}

function asString(value: unknown) {
  return String(value);
}

function asNumber(value: unknown) {
  return Number(value);
}

export const aptos_service_config = {
  networkLabel: app_config.networkLabel,
  moduleAddress: app_config.moduleAddress,
  moduleName: app_config.moduleName,
  moduleId: module_id
} as const;

export async function categoryMeme(): Promise<number> {
  return asNumber(await viewOne("categoryMeme"));
}

export async function categoryImage(): Promise<number> {
  return asNumber(await viewOne("categoryImage"));
}

export async function categoryAudio(): Promise<number> {
  return asNumber(await viewOne("categoryAudio"));
}

export async function categoryVideo(): Promise<number> {
  return asNumber(await viewOne("categoryVideo"));
}

export async function getCategoryConstants(): Promise<ChainCategoryConstants> {
  const [meme, image, audio, video] = await Promise.all([
    categoryMeme(),
    categoryImage(),
    categoryAudio(),
    categoryVideo()
  ]);

  return { meme, image, audio, video };
}

export async function getTreasuryAddress(): Promise<string> {
  return asString(await viewOne("getTreasuryAddress"));
}

export async function getProtocolConfig(): Promise<ChainProtocolConfig> {
  const [
    protocolFeeBps,
    minPushAmount,
    minBuffAmount,
    minPushIncrementBps,
    matchDurationSeconds,
    buffCommitmentAmount,
    skipPenaltyAmount,
    randomRetryCount,
    scoreAlgorithmType,
    scoreScale,
    scoreLogBase,
    treasuryAddress,
    adminAddress
  ] = await Promise.all([
    viewOne("getProtocolFeeBps"),
    viewOne("getMinPushAmount"),
    viewOne("getMinBuffAmount"),
    viewOne("getMinPushIncrementBps"),
    viewOne("getMatchDurationSeconds"),
    viewOne("getBuffCommitmentAmount"),
    viewOne("getSkipPenaltyAmount"),
    viewOne("getRandomRetryCount"),
    viewOne("getScoreAlgorithmType"),
    viewOne("getScoreScale"),
    viewOne("getScoreLogBase"),
    viewOne("getTreasuryAddress"),
    viewOne("getAdminAddress")
  ]);

  return {
    protocolFeeBps: asString(protocolFeeBps),
    minPushAmount: asString(minPushAmount),
    minBuffAmount: asString(minBuffAmount),
    minPushIncrementBps: asString(minPushIncrementBps),
    matchDurationSeconds: asString(matchDurationSeconds),
    buffCommitmentAmount: asString(buffCommitmentAmount),
    skipPenaltyAmount: asString(skipPenaltyAmount),
    randomRetryCount: asString(randomRetryCount),
    scoreAlgorithmType: asNumber(scoreAlgorithmType),
    scoreScale: asString(scoreScale),
    scoreLogBase: asString(scoreLogBase),
    treasuryAddress: asString(treasuryAddress),
    adminAddress: asString(adminAddress)
  };
}

export async function getChainReadSnapshot() {
  const [categories, protocolConfig] = await Promise.all([
    getCategoryConstants(),
    getProtocolConfig()
  ]);

  return {
    categories,
    treasuryAddress: protocolConfig.treasuryAddress,
    protocolConfig
  };
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

// Future signed entry-function boundary. Local UI flows call provider actions until real Aptos transactions are wired.
export async function submitPalateTransaction(_functionName: string, _args: unknown[]): Promise<never> {
  void _functionName;
  void _args;
  notImplemented("submitPalateTransaction");
}
