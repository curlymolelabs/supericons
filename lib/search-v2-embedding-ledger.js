import {
  closeSync,
  fsyncSync,
  mkdirSync,
  openSync,
  writeSync,
} from 'node:fs';
import path from 'node:path';

const FINGERPRINT_PATTERN = /^[a-f0-9]{64}$/;

function writeLine(filePath, flag, value) {
  const descriptor = openSync(filePath, flag);
  try {
    writeSync(descriptor, `${JSON.stringify(value)}\n`, null, 'utf8');
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

function baseEvent(eventName) {
  return {
    schema_version: 'search-v2-embedding-sample-ledger-event-1',
    event: eventName,
    recorded_at: new Date().toISOString(),
  };
}

export function createFileEmbeddingSampleLedger({ rootDirectory } = {}) {
  const root = String(rootDirectory || '').trim();
  if (!root) throw new Error('A local execution-ledger directory is required.');
  let filePath = null;

  function requireReservedPath() {
    if (!filePath) throw new Error('Embedding sample execution has not been reserved.');
    return filePath;
  }

  return {
    reserve({ authorization_fingerprint: fingerprint, spend_cap_usd: spendCapUsd, approved_request_count: requestCount }) {
      if (!FINGERPRINT_PATTERN.test(String(fingerprint || ''))) {
        throw new Error('A valid authorization fingerprint is required for the execution ledger.');
      }
      mkdirSync(root, { recursive: true });
      filePath = path.join(root, `${fingerprint}.jsonl`);
      try {
        writeLine(filePath, 'wx', {
          ...baseEvent('execution_reserved'),
          authorization_fingerprint: fingerprint,
          spend_cap_usd: Number(spendCapUsd),
          approved_request_count: Number(requestCount),
        });
      } catch (error) {
        filePath = null;
        if (error?.code === 'EEXIST') {
          throw new Error('Embedding sample execution already exists for this approval.');
        }
        throw error;
      }
    },
    recordAttempt({ attempt_number: attemptNumber, candidate_id: candidateId, input_kind: inputKind }) {
      writeLine(requireReservedPath(), 'a', {
        ...baseEvent('request_reserved'),
        attempt_number: Number(attemptNumber),
        candidate_id: String(candidateId || ''),
        input_kind: String(inputKind || ''),
      });
    },
    recordFailure({ request_attempt_count: requestAttemptCount, completed_candidate_count: completedCandidateCount, failed_candidate_id: candidateId, failed_input_kind: inputKind }) {
      writeLine(requireReservedPath(), 'a', {
        ...baseEvent('execution_failed'),
        request_attempt_count: Number(requestAttemptCount),
        completed_candidate_count: Number(completedCandidateCount),
        failed_candidate_id: candidateId ? String(candidateId) : null,
        failed_input_kind: inputKind ? String(inputKind) : null,
      });
    },
    recordSuccess({ request_count: requestCount, completed_candidate_count: completedCandidateCount }) {
      writeLine(requireReservedPath(), 'a', {
        ...baseEvent('execution_completed'),
        request_count: Number(requestCount),
        completed_candidate_count: Number(completedCandidateCount),
      });
    },
    getFilePath() {
      return filePath;
    },
  };
}
