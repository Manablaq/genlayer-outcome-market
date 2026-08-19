import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const RPC_URL = "https://rpc-bradbury.genlayer.com";
const CONTRACT_ADDRESS = "0xFE05AB8678F9EE7035E53579dE229CCed93FE5bF";
const DEPLOYMENT_TX = "0x2091634bde3647f37c3baaa4ce5fddd2034a91ee0803c535ba8f19cda4e700ef";
const EXPECTED_SOURCE_SHA256 = "8a8bc9cdb672795f37042d570dd422e70eac78ca8a55ffe5d9d8ca7476b806cd";
const STATUS_FINALIZED = 7;
const RESULT_AGREE = 1;
const EXECUTION_FINISHED_WITH_RETURN = 1;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function rpc(method, params) {
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  assert(response.ok, `Bradbury RPC returned HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(`${payload.error.code}: ${payload.error.message}`);
  return payload.result;
}

const contractPath = fileURLToPath(new URL("../contracts/outcome_market.py", import.meta.url));
const repositorySource = await readFile(contractPath);
const receipt = await rpc("gen_getTransactionReceipt", [{ txId: DEPLOYMENT_TX }]);

assert(receipt, "Deployment transaction was not found");
assert(receipt.status === STATUS_FINALIZED, `Deployment status is ${receipt.status}, expected FINALIZED (${STATUS_FINALIZED})`);
assert(receipt.result === RESULT_AGREE, `Consensus result is ${receipt.result}, expected AGREE (${RESULT_AGREE})`);
assert(
  receipt.txExecutionResult === EXECUTION_FINISHED_WITH_RETURN,
  `Execution result is ${receipt.txExecutionResult}, expected FINISHED_WITH_RETURN (${EXECUTION_FINISHED_WITH_RETURN})`,
);
assert(
  receipt.recipient?.toLowerCase() === CONTRACT_ADDRESS.toLowerCase(),
  `Receipt recipient ${receipt.recipient} does not match ${CONTRACT_ADDRESS}`,
);

const transactionBytes = Buffer.from(receipt.txCallData, "hex");
const sourceStart = transactionBytes.indexOf(Buffer.from('# { "Depends"'));
assert(sourceStart >= 0, "Could not locate the Python source in deployment calldata");
const deployedSource = transactionBytes.subarray(sourceStart, sourceStart + repositorySource.length);
assert(deployedSource.equals(repositorySource), "Deployed source does not match contracts/outcome_market.py byte-for-byte");

const sourceSha256 = createHash("sha256").update(repositorySource).digest("hex");
assert(sourceSha256 === EXPECTED_SOURCE_SHA256, `Source SHA-256 ${sourceSha256} does not match the release record`);

console.log(JSON.stringify({
  network: "Bradbury",
  contractAddress: CONTRACT_ADDRESS,
  deploymentTransaction: DEPLOYMENT_TX,
  finalized: true,
  consensus: "AGREE",
  execution: "FINISHED_WITH_RETURN",
  sourceMatchesRepository: true,
  sourceSha256,
}, null, 2));
