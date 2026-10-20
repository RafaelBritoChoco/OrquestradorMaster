#!/usr/bin/env node
// Node.js >=22. No dependencies, retries, fallback providers, or action execution.
import { createHash } from 'node:crypto';
import { readFile, writeFile, appendFile, mkdir, rename, rm, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const MODEL = 'jev-1.13.0';
export const SCHEMA = 'maestro-jev-evaluation-v2';
export const MAX_BYTES = 24_000;
export const ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
export const PRICING = Object.freeze({
  model: MODEL, inputUsdPerMillion: 0.042, outputUsdPerMillion: 0,
  checkedOn: '2026-10-12', source: 'https://docs.typesafe.ai/models',
  notice: 'Estimate from reported tokens and published tariff; not a billing guarantee.',
});
const MAX_RESPONSE_BYTES = 1_000_000;
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const probability = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
const exactKeys = (value, keys) => isObject(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const hasOnly = (value, keys) => isObject(value) && Object.keys(value).every(key => keys.includes(key));
const fail = code => Object.assign(new Error(code), { code });

function jsonValue(value, depth = 0) {
  if (depth > 40) return false;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(item => jsonValue(item, depth + 1));
  return isObject(value) && Object.getPrototypeOf(value) === Object.prototype
    && Object.values(value).every(item => jsonValue(item, depth + 1));
}
function textShape(value) {
  return jsonValue(value) && (typeof value === 'string' ? value.trim().length > 0
    : Array.isArray(value) ? value.length > 0 : isObject(value) && Object.keys(value).length > 0);
}
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (isObject(value)) return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
const digest = value => createHash('sha256').update(canonical(value)).digest('hex');

export function validateRequest(request) {
  if (!jsonValue(request) || !exactKeys(request, ['model', 'state', 'questions'])) throw fail('REQUEST_INVALID');
  if (request.model !== MODEL) throw fail('MODEL_NOT_PINNED');
  if (Buffer.byteLength(JSON.stringify(request), 'utf8') > MAX_BYTES) throw fail('REQUEST_TOO_LARGE');
  if (!textShape(request.state) || !isObject(request.questions)) throw fail('REQUEST_INVALID');
  const questions = Object.entries(request.questions);
  if (questions.length < 1 || questions.length > 24) throw fail('QUESTION_COUNT_INVALID');
  for (const [id, question] of questions) {
    if (!id.trim() || !hasOnly(question, ['type', 'instructions', 'criteria']) || !textShape(question.instructions)) throw fail('QUESTION_INVALID');
    if (question.type === 'choice') {
      if (!isObject(question.criteria)) throw fail('CHOICE_CRITERIA_INVALID');
      const entries = Object.entries(question.criteria);
      if (entries.length < 2 || entries.length > 255 || entries.some(([key, value]) => !key.trim() || (value !== null && !textShape(value)))) throw fail('CHOICE_CRITERIA_INVALID');
    } else if (question.type === 'noul') {
      if (Object.hasOwn(question, 'criteria') && (!hasOnly(question.criteria, ['true', 'false']) || Object.values(question.criteria).some(value => !textShape(value)))) throw fail('NOUL_CRITERIA_INVALID');
    } else if (question.type === 'score') {
      if (!Array.isArray(question.criteria) || question.criteria.length < 2 || question.criteria.length > 10 || !question.criteria.every(textShape)) throw fail('SCORE_CRITERIA_INVALID');
    } else throw fail('QUESTION_TYPE_INVALID');
  }
  return request;
}

export function parseRequest(raw) {
  if (Buffer.byteLength(raw, 'utf8') > MAX_BYTES) throw fail('REQUEST_TOO_LARGE');
  let request;
  try { request = JSON.parse(raw); } catch { throw fail('REQUEST_JSON_INVALID'); }
  return validateRequest(request);
}

function distribution(value, keys) {
  if (!exactKeys(value, keys) || !Object.values(value).every(probability)) throw fail('ANSWER_DISTRIBUTION_INVALID');
  // The service rounds probabilities. Allow at most 0.005 rounding per option.
  const sum = Object.values(value).reduce((total, p) => total + p, 0);
  const tolerance = Math.min(0.05, 0.005 * keys.length + 1e-9);
  if (Math.abs(sum - 1) > tolerance) throw fail('ANSWER_DISTRIBUTION_INVALID');
}

export function validateResponse(request, response) {
  if (!isObject(response) || response.model !== request.model || !exactKeys(response.answers, Object.keys(request.questions))) throw fail('RESPONSE_INVALID');
  if (!isObject(response.usage)) throw fail('USAGE_INVALID');
  const usage = {};
  for (const key of ['input_tokens', 'output_tokens']) {
    if (Object.hasOwn(response.usage, key)) {
      if (!Number.isSafeInteger(response.usage[key]) || response.usage[key] < 0) throw fail('USAGE_INVALID');
      usage[key] = response.usage[key];
    }
  }
  const answers = {};
  for (const [id, question] of Object.entries(request.questions)) {
    const answer = response.answers[id];
    if (!isObject(answer) || answer.type !== question.type) throw fail('ANSWER_TYPE_INVALID');
    if (question.type === 'noul') {
      if (!exactKeys(answer, ['type', 'noul']) || !probability(answer.noul)) throw fail('NOUL_ANSWER_INVALID');
    } else {
      if (!probability(answer.confidence)) throw fail('ANSWER_CONFIDENCE_INVALID');
      if (question.type === 'choice') {
        if (!exactKeys(answer, ['type', 'choice', 'probabilities', 'confidence']) || typeof answer.choice !== 'string' || !Object.hasOwn(question.criteria, answer.choice)) throw fail('CHOICE_ANSWER_INVALID');
        distribution(answer.probabilities, Object.keys(question.criteria));
        if (answer.probabilities[answer.choice] < Math.max(...Object.values(answer.probabilities))) throw fail('CHOICE_NOT_MAXIMUM');
      } else {
        const keys = question.criteria.map((_, index) => String(index));
        if (!exactKeys(answer, ['type', 'score', 'legend', 'probabilities', 'confidence']) || !exactKeys(answer.legend, keys)) throw fail('SCORE_ANSWER_INVALID');
        if (keys.some(key => typeof answer.legend[key] !== 'string')) throw fail('SCORE_LEGEND_INVALID');
        // Structured criteria have a server-rendered legend; string criteria must agree exactly.
        if (keys.some(key => typeof question.criteria[key] === 'string' && answer.legend[key] !== question.criteria[key])) throw fail('SCORE_LEGEND_INVALID');
        distribution(answer.probabilities, keys);
        if (!Number.isFinite(answer.score) || answer.score < 0 || answer.score > keys.length - 1) throw fail('SCORE_RANGE_INVALID');
        const expected = keys.reduce((total, key) => total + Number(key) * answer.probabilities[key], 0);
        const tolerance = 0.01 + 0.005 * keys.reduce((total, key) => total + Number(key), 0);
        if (Math.abs(answer.score - expected) > tolerance) throw fail('SCORE_DISTRIBUTION_MISMATCH');
      }
    }
    Object.defineProperty(answers, id, { value: structuredClone(answer), enumerable: true });
  }
  // Drop provider metadata rather than printing arbitrary response fields.
  return { model: response.model, answers, usage };
}

export function requestHash(request) {
  validateRequest(request);
  return payloadHash(JSON.stringify(request));
}

// Choice order can change Jev's answer. Cache the exact serialized input,
// including ordering within state/instructions, instead of sorting its keys.
const payloadHash = payload => digest({ schema: SCHEMA, endpoint: ENDPOINT, model: MODEL, payload });

async function boundedFile(path, limit) {
  if ((await stat(path)).size > limit) throw fail('FILE_TOO_LARGE');
  const raw = await readFile(path, 'utf8');
  if (Buffer.byteLength(raw, 'utf8') > limit) throw fail('FILE_TOO_LARGE');
  return raw;
}

async function readCache(cacheDir, hash, request) {
  try {
    const entry = JSON.parse(await boundedFile(join(cacheDir, hash + '.json'), MAX_RESPONSE_BYTES));
    if (!exactKeys(entry, ['schema', 'requestHash', 'responseHash', 'response']) || entry.schema !== SCHEMA || entry.requestHash !== hash || entry.responseHash !== digest(entry.response)) throw fail('CACHE_INVALID');
    return validateResponse(request, entry.response);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw fail('CACHE_INVALID');
  }
}

async function saveCache(cacheDir, hash, response) {
  await mkdir(cacheDir, { recursive: true, mode: 0o700 });
  const path = join(cacheDir, hash + '.json');
  const temporary = path + '.' + process.pid + '.' + createHash('sha256').update(String(Math.random())).digest('hex').slice(0, 12) + '.tmp';
  try {
    await writeFile(temporary, JSON.stringify({ schema: SCHEMA, requestHash: hash, responseHash: digest(response), response }), { mode: 0o600, flag: 'wx' });
    await rename(temporary, path);
  } finally { await rm(temporary, { force: true }).catch(() => {}); }
}

async function responseJSON(response) {
  const reader = response.body?.getReader();
  if (!reader) throw fail('RESPONSE_INVALID');
  let bytes = 0;
  const chunks = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) throw fail('RESPONSE_TOO_LARGE');
      chunks.push(Buffer.from(value));
    }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw fail('RESPONSE_JSON_INVALID'); }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export async function evaluate(request, { live = false, cacheDir, ledgerPath, fetchImpl = globalThis.fetch, env = process.env } = {}) {
  const start = performance.now();
  const telemetry = { schema: SCHEMA, timestamp: new Date().toISOString(), model: MODEL,
    mode: live ? 'live' : 'dry-run', requestHash: null, requestBytes: null, questionCount: null,
    apiCalls: 0, httpStatus: null, latencyMs: 0, reportedUsage: null,
    costState: 'not_sent', estimatedCostUsd: null, pricing: PRICING, cache: cacheDir ? 'not_checked' : 'disabled' };
  let result;
  let failure;
  try {
    validateRequest(request);
    const payload = JSON.stringify(request);
    telemetry.requestHash = payloadHash(payload);
    telemetry.requestBytes = Buffer.byteLength(payload, 'utf8');
    telemetry.questionCount = Object.keys(request.questions).length;
    if (!live) result = { dryRun: true, limits: { requestBytes: MAX_BYTES, questions: 24, apiCalls: 1, timeoutMs: 60_000 }, notice: 'No API call. Limits control effort, not a guaranteed USD ceiling.' };
    else {
      const cached = cacheDir ? await readCache(cacheDir, telemetry.requestHash, request) : null;
      if (cached) {
        telemetry.mode = 'cache'; telemetry.cache = 'hit'; telemetry.costState = 'no_api_call'; telemetry.estimatedCostUsd = 0;
        result = { answers: cached.answers, notice: 'Cached judgments; no tokens consumed by a new API call. Confidence is not measured accuracy.' };
      } else {
        if (cacheDir) telemetry.cache = 'miss';
        const key = env.TYPESAFE_API_KEY;
        if (typeof key !== 'string' || !key.trim()) throw fail('TYPESAFE_API_KEY_REQUIRED');
        telemetry.apiCalls = 1; telemetry.costState = 'unknown';
        let response;
        try {
          response = await fetchImpl(ENDPOINT, { method: 'POST', redirect: 'error',
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
            body: payload, signal: AbortSignal.timeout(60_000) });
        } catch { throw fail('API_TRANSPORT_OR_TIMEOUT'); }
        telemetry.httpStatus = response.status;
        if (response.status !== 200) {
          await response.body?.cancel().catch(() => {});
          throw fail('API_HTTP_' + response.status);
        }
        const data = validateResponse(request, await responseJSON(response));
        telemetry.reportedUsage = data.usage;
        if (Object.hasOwn(data.usage, 'input_tokens')) {
          telemetry.estimatedCostUsd = data.usage.input_tokens * PRICING.inputUsdPerMillion / 1_000_000;
          telemetry.costState = 'estimated';
        }
        result = { answers: data.answers, notice: 'Judgments only; no actions executed. Confidence is not measured accuracy.' };
        if (cacheDir) {
          try { await saveCache(cacheDir, telemetry.requestHash, data); }
          catch { throw fail('CACHE_WRITE_FAILED'); }
        }
      }
    }
  } catch (error) {
    failure = error.code && /^[A-Z][A-Z_0-9]+$/.test(error.code) ? error : fail('EVALUATION_FAILED');
    telemetry.error = failure.code;
  }
  telemetry.latencyMs = Math.round((performance.now() - start) * 1000) / 1000;
  if (ledgerPath) {
    try { await appendFile(ledgerPath, JSON.stringify(telemetry) + '\n', { mode: 0o600 }); }
    catch { failure = fail('LEDGER_WRITE_FAILED'); telemetry.error = failure.code; }
  }
  if (failure) { failure.telemetry = telemetry; throw failure; }
  return { ...result, telemetry };
}

export function parseArgs(args) {
  const result = { live: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--live' && !result.live) result.live = true;
    else if (arg === '--cache-dir' || arg === '--ledger') {
      const key = arg === '--cache-dir' ? 'cacheDir' : 'ledgerPath';
      if (result[key] || !args[i + 1] || args[i + 1].startsWith('--')) throw fail('CLI_ARGUMENTS_INVALID');
      result[key] = resolve(args[++i]);
    } else if (arg === '--help') result.help = true;
    else if (!arg.startsWith('-') && !result.path) result.path = resolve(arg);
    else throw fail('CLI_ARGUMENTS_INVALID');
  }
  if (!result.help && !result.path) throw fail('REQUEST_FILE_REQUIRED');
  return result;
}

export async function main(args = process.argv.slice(2)) {
  try {
    const options = parseArgs(args);
    if (options.help) {
      console.log('node jev-evaluate.mjs request.json [--live] [--cache-dir DIR] [--ledger FILE]\nDry-run by default. --live permits one API call; cache hits need no key. TYPESAFE_API_KEY only from environment.\nModel pinned to jev-1.13.0. No retries, fallbacks, or action execution.');
      return;
    }
    let raw;
    try { raw = await boundedFile(options.path, MAX_BYTES); }
    catch (error) { throw fail(error.code === 'FILE_TOO_LARGE' ? 'REQUEST_TOO_LARGE' : 'REQUEST_READ_FAILED'); }
    console.log(JSON.stringify(await evaluate(parseRequest(raw), options), null, 2));
  } catch (error) {
    console.error(JSON.stringify({ error: error.code || 'EVALUATION_FAILED', ...(error.telemetry ? { telemetry: error.telemetry } : {}) }));
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
