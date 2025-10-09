const vscode = require('vscode');
const cp = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

let out;
let lastPayload = null;
let lastContext = null;
let terminalBuffer = [];
let terminalRemainder = '';
let terminalBufferHardLimit = 800;

function log(...args){ (out||=vscode.window.createOutputChannel('Kars Commit AI')).appendLine(args.join(' ')); }
function show(){ (out||=vscode.window.createOutputChannel('Kars Commit AI')).show(true); }
function logSection(title, body){ log(`[${title}]`); (body||'').split(/\r?\n/).forEach(line=>log(line)); }

function stripAnsi(text){
  if(!text) return '';
  return String(text)
    .replace(/\u001b\[[0-9;:?]*[ -\/]*[@-~]/g, '') // CSI sequences
    .replace(/[\u0007\u0008]/g, '');
}

function pushTerminalData(chunk){
  if(!chunk) return;
  const sanitized = stripAnsi(chunk).replace(/\r/g, '\n');
  const merged = terminalRemainder + sanitized;
  const parts = merged.split('\n');
  terminalRemainder = parts.pop() || '';
  for(const line of parts){
    terminalBuffer.push(line);
    if(terminalBuffer.length > terminalBufferHardLimit){
      terminalBuffer = terminalBuffer.slice(-terminalBufferHardLimit);
    }
  }
}

function setTerminalBufferHardLimit(limit){
  const parsed = Number(limit);
  if(Number.isFinite(parsed) && parsed > 50){
    terminalBufferHardLimit = Math.floor(parsed);
  }
  if(terminalBuffer.length > terminalBufferHardLimit){
    terminalBuffer = terminalBuffer.slice(-terminalBufferHardLimit);
  }
}

function getTerminalSnapshot(lines){
  const count = Math.max(0, Math.min(Number(lines) || 0, terminalBuffer.length));
  if(!count) return [];
  return terminalBuffer.slice(-count);
}

function clampNumber(value, fallback, min, max){
  const num = Number(value);
  if(!Number.isFinite(num)) return fallback;
  let result = Math.floor(num);
  if(typeof min === 'number' && result < min) result = min;
  if(typeof max === 'number' && result > max) result = max;
  return result;
}

const ALLOWED_TYPES = ['feat','fix','perf','refactor','style','docs','test','build','ci','chore','revert'];

const COMMIT_SCHEMA_OBJECT = {
  type: 'object',
  additionalProperties: false,
  required: ['type','scope','subject','body','breaking_change','issues','rationale'],
  properties: {
    type: { type: 'string', enum: ALLOWED_TYPES },
    scope: { type: 'string', description: 'lowercase scope token or empty string', default: '' },
    subject: {
      type: 'string',
      minLength: 8,
      maxLength: 72,
      description: 'Imperative summary listing concrete values such as versions, configuration keys, or renamed services.'
    },
    body: {
      type: 'array',
      minItems: 1,
      maxItems: 6,
      description: 'Each entry is a terse fragment (e.g., "env config cleanup") covering one significant change.',
      items: {
        type: 'string',
        minLength: 4,
        maxLength: 120
      }
    },
    breaking_change: { type: 'string', description: 'Explanation for BREAKING CHANGE or empty string' },
    issues: { type: 'array', items: { type: 'string' }, description: 'Issue references such as "Closes #123"' },
    rationale: { type: 'string', description: 'Internal audit note (not part of commit message)' }
  }
};

const COMMIT_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'commit_message',
    description: 'Structured Conventional Commit payload for kars-commit-ai',
    strict: true,
    schema: COMMIT_SCHEMA_OBJECT
  }
};

const SYSTEM_PROMPT = `<role>You are a senior engineer who produces precise Conventional Commit payloads.</role>

<requirements>
- Follow the commit_message schema exactly and emit JSON only (no code fences).
- Map commit types precisely: feat for capability or DX gains, fix for bug remediation, chore for maintenance/config housekeeping, perf for measurable performance gains; docs/test/build/ci/style/refactor only when that theme dominates.
- Scope must be a single lowercase module or folder token (e.g., context, config, infra) or empty.
- Subject must be imperative, ≤72 characters, combine all primary changes into one sentence, and include literal values (old→new versions, configuration keys, renamed services, numeric limits).
- Respect any language_instruction rigidly: render the subject, body fragments, and rationale in that locale—even if prior commits or diffs use another language—while keeping the Conventional Commit type/scope tokens in English.
 - Respect any language_instruction rigidly: render the subject, body fragments, and rationale in that locale—even if prior commits or diffs use another language—while keeping the Conventional Commit type/scope tokens in English. If you cannot comply, output a schema-valid object with subject LANGUAGE_POLICY_VIOLATION and an empty body array.
- Body must be an array of terse fragments (≤12 words, no trailing punctuation); each entry cites the touched artifact/key/value and ends with an action noun such as "cleanup", "addition", "removal", or "sync".
- Enumerate every significant change from the supplied context in order of impact.
 - Never invent data or reference git metadata; rely solely on the provided context and diffs, and avoid filler such as "This commit".
 - After composing the response, double-check that every narrative string satisfies the language_instruction before returning it.
</requirements>

<output_format>Return exactly one commit_message JSON object.</output_format>`;

function normalizeEndpoint(url, allowRewrite){
  try {
    const u = new URL(url);
    if (allowRewrite && u.pathname === '/api/v1/responses') {
      u.pathname = '/api/alpha/responses';
      log(`Endpoint normalized: ${url} -> ${u.toString()}`);
      return u.toString();
    }
    return url;
  } catch { return url; }
}
function normalizeModel(model){
  if (model === 'google/gemini-flash-lite-latest') return 'google/gemini-2.5-flash-lite';
  return model;
}

function getConfig(){
  const c = vscode.workspace.getConfiguration();
  const commitLanguageRaw = c.get('karsCommitAI.commitLanguage');
  const commitLanguage = commitLanguageRaw === undefined ? '' : String(commitLanguageRaw || '').trim();
  const endpointRaw = c.get('karsCommitAI.endpoint') || 'https://openrouter.ai/api/v1/chat/completions';
  const endpoint = normalizeEndpoint(endpointRaw, !!c.get('karsCommitAI.endpointRewrite'));
  const compat = c.get('dish-ai-commit.features.branchName.systemPrompt', '');
  return {
    apiKey: c.get('karsCommitAI.apiKey') || '',
    model: normalizeModel(c.get('karsCommitAI.model') || 'google/gemini-2.5-flash-lite'),
    endpoint,
    transport: c.get('karsCommitAI.transport') || 'fetch',
    timeoutMs: c.get('karsCommitAI.requestTimeoutMs') || 25000,
    logRaw: !!c.get('karsCommitAI.logRawResponse'),
    include: c.get('karsCommitAI.contextIncludeGlobs') || ['**/*'],
    ignore: c.get('karsCommitAI.contextIgnoreGlobs') || ['**/*.lock','dist/**','build/**','out/**','**/*.svg','**/*.png','**/*.jpg'],
    maxFilePatchBytes: c.get('karsCommitAI.maxFilePatchBytes') || 12000,
    maxPatchBytes: c.get('karsCommitAI.maxPatchBytes') || 50000,
    referer: c.get('karsCommitAI.referer') || 'https://kargn.as',
    title: c.get('karsCommitAI.title') || 'kars - Commit AI',
    systemPrompt: (compat ? compat + '\n\n' : '') + (c.get('karsCommitAI.systemPrompt') || SYSTEM_PROMPT),
    previousCommitLimit: clampNumber(c.get('karsCommitAI.previousCommitLimit'), 10, 1, 25),
    openTabsLimit: clampNumber(c.get('karsCommitAI.openTabsLimit'), 10, 0, 40),
    terminalLogLines: clampNumber(c.get('karsCommitAI.terminalLogLines'), 20, 0, 200),
    projectTreeMaxEntries: clampNumber(c.get('karsCommitAI.projectTreeMaxEntries'), 400, 50, 1200),
    heavyDiffMaxLines: clampNumber(c.get('karsCommitAI.heavyDiffMaxLines'), 500, 50, 1000),
    heavyDiffMaxFiles: clampNumber(c.get('karsCommitAI.heavyDiffMaxFiles'), 3, 0, 6),
    logPromptMaxChars: clampNumber(c.get('karsCommitAI.logPromptMaxChars'), 0, 0, 1000000),
    commitLanguage
  };
}

async function getGitAPI(){
  const ext = vscode.extensions.getExtension('vscode.git');
  if(!ext) throw new Error('Git extension not found');
  if(!ext.isActive) await ext.activate();
  return ext.exports.getAPI(1);
}

function exec(cmd, cwd){
  return new Promise((resolve, reject)=>{
    cp.exec(cmd, { cwd, maxBuffer: 32*1024*1024 }, (err, stdout, stderr)=>{
      if(err) return reject(new Error(stderr || err?.message || String(err)));
      resolve({ stdout, stderr });
    });
  });
}

function execFile(bin, args, cwd){
  return new Promise((resolve, reject)=>{
    cp.execFile(bin, args, { cwd, maxBuffer: 32*1024*1024 }, (err, stdout, stderr)=>{
      if(err) return reject(new Error(stderr || err?.message || String(err)));
      resolve({ stdout, stderr });
    });
  });
}

async function ensureStagedOrOfferStageAll(repo){
  const count = repo.state.indexChanges?.length || 0;
  if(count>0) return true;
  const pick = await vscode.window.showWarningMessage('No staged changes. Stage all and continue?', 'Stage all', 'Cancel');
  if(pick !== 'Stage all') return false;
  await vscode.commands.executeCommand('git.stageAll');
  await new Promise(r=>setTimeout(r, 200));
  return (repo.state.indexChanges?.length || 0) > 0;
}

async function runGit(cwd, args, allowEmpty = true){
  try {
    const { stdout } = await execFile('git', args, cwd);
    return stdout.trimEnd();
  } catch (err){
    if(!allowEmpty) throw err;
    log(`[warn] git ${args.join(' ')} failed: ${err.message}`);
    return '';
  }
}

function parseLanguages(files){
  const map = new Map();
  const extToLang = {
    '.ts':'ts','.tsx':'ts','.js':'js','.jsx':'js','.mjs':'js','.cjs':'js','.php':'php','.py':'py','.rb':'rb','.java':'java','.cs':'cs','.go':'go','.rs':'rs','.swift':'swift','.kt':'kt','.m':'objc','.mm':'objc','.sql':'sql','.sh':'sh','.yml':'yml','.yaml':'yml','.json':'json','.md':'md','.css':'css','.scss':'scss','.less':'less','.html':'html'
  };
  files.forEach(rel=>{
    const ext = path.extname(rel).toLowerCase();
    const lang = extToLang[ext];
    if(lang) map.set(lang, true);
  });
  return Array.from(map.keys()).sort();
}

function buildServiceMap(files){
  const map = {};
  files.forEach(rel=>{
    const parts = rel.split('/');
    if(parts.length > 1){
      const key = parts[0];
      if(!map[key]) map[key] = key;
    }
  });
  return map;
}

function parseBranchHints(branch){
  const hints = [];
  const lowered = branch.toLowerCase();
  ALLOWED_TYPES.forEach(type=>{ if(lowered.includes(type)) hints.push(type); });
  const ticketMatches = branch.match(/\d+/g);
  if(ticketMatches) hints.push(...ticketMatches);
  const issueMatches = branch.match(/[A-Z]+-\d+/g);
  if(issueMatches) hints.push(...issueMatches);
  return Array.from(new Set(hints));
}

function detectIntent(diffText){
  const lower = diffText.toLowerCase();
  if(/n\+1|bug|fix|issue|error|exception/.test(lower)) return 'bugfix';
  if(/perf|cache|latency|optimi[sz]e|memo/.test(lower)) return 'perf';
  if(/refactor|cleanup|rename/.test(lower)) return 'refactor';
  if(/style|format|whitespace/.test(lower)) return 'style';
  return 'unknown';
}

function extractSymbols(diffText){
  const symbols = new Set();
  diffText.split('\n').forEach(line=>{
    if(line.startsWith('+') || line.startsWith('-')){
      const stripped = line.slice(1);
      const fnMatch = stripped.match(/function\s+([\w$]+)/);
      if(fnMatch) symbols.add(fnMatch[1]);
      const clsMatch = stripped.match(/class\s+([\w$]+)/);
      if(clsMatch) symbols.add(clsMatch[1]);
      const methodMatch = stripped.match(/([\w$]+)\s*\([^)]*\)\s*\{/);
      if(methodMatch && methodMatch[1].length <= 40) symbols.add(methodMatch[1]);
    }
  });
  return Array.from(symbols).slice(0, 10);
}

function cleanJsonFence(text){
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if(fence) return fence[1].trim();
  return text.trim();
}

function parseJSONSafely(text){
  try { return JSON.parse(text); } catch {}
  const cleaned = cleanJsonFence(text);
  try { return JSON.parse(cleaned); } catch {}
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if(first !== -1 && last !== -1){
    try { return JSON.parse(cleaned.slice(first, last+1)); } catch {}
  }
  return null;
}

function normaliseLanguagePreference(pref){
  if(pref === null || pref === undefined) return 'auto';
  const value = String(pref).trim();
  return value ? value : 'auto';
}

function buildLanguageInstruction(pref){
  const value = normaliseLanguagePreference(pref);
  if(value.toLowerCase() === 'auto') return '';
  return `<language_instruction>All narrative fields (subject, body fragments, rationale) must be written in ${value}. Ignore the language used in prior commits or diffs. If producing valid ${value} narrative text is impossible, emit LANGUAGE_POLICY_VIOLATION in the subject and use an empty body array. Keep the Conventional Commit type/scope tokens in English.</language_instruction>`;
}

async function buildProjectTree(repo, cwd, cfg, stagedStatusMap){
  const trackedRes = await execFile('git', ['ls-files'], cwd).catch(()=>({ stdout:'' }));
  const untrackedRes = await execFile('git', ['ls-files','--others','--exclude-standard'], cwd).catch(()=>({ stdout:'' }));
  const normalize = (p)=>{
    // Remove git's quoting for special characters
    let cleaned = p.trim();
    if(cleaned.startsWith('"') && cleaned.endsWith('"')){
      cleaned = cleaned.slice(1, -1);
      // Unescape git's escape sequences (handles octal like \345)
      cleaned = cleaned.replace(/\\([0-7]{3})/g, (_, oct) => {
        return String.fromCharCode(parseInt(oct, 8));
      });
      cleaned = cleaned.replace(/\\([\\"])/g, '$1');
    }
    // Normalize path separators and filter invalid paths
    cleaned = cleaned.split('\\').join('/');
    // Reject paths with suspicious patterns
    if(cleaned.includes('//') || cleaned.includes('/../') || cleaned.startsWith('..')) return null;
    return cleaned;
  };
  const tracked = trackedRes.stdout.split('\n').map(normalize).filter(Boolean);
  const untracked = untrackedRes.stdout.split('\n').map(normalize).filter(Boolean);
  const statusMap = new Map();
  const ensure = (rel)=>{
    if(!statusMap.has(rel)) statusMap.set(rel, { staged:false, unstaged:false, merge:false, untracked:false, codes:new Set() });
    return statusMap.get(rel);
  };

  const addChanges = (changes, key)=>{
    (changes||[]).forEach(change=>{
      const uri = change.originalUri?.fsPath || change.resourceUri?.fsPath || change.uri?.fsPath;
      if(!uri) return;
      const rel = path.relative(cwd, uri);
      if(!rel || rel.startsWith('..')) return;
      const norm = normalize(rel);
      ensure(norm)[key] = true;
      const statusCode = stagedStatusMap?.get(norm);
      if(statusCode){ ensure(norm).codes.add(statusCode); }
    });
  };

  addChanges(repo.state.indexChanges, 'staged');
  addChanges(repo.state.workingTreeChanges, 'unstaged');
  addChanges(repo.state.mergeChanges, 'merge');
  untracked.forEach(rel=>{ ensure(rel).untracked = true; ensure(rel).codes.add('A'); });

  const explicitStatusMap = stagedStatusMap || new Map();
  explicitStatusMap.forEach((code, rel)=>{
    ensure(rel).codes.add(code);
  });

  const allFiles = Array.from(new Set([...tracked, ...untracked, ...statusMap.keys()])).sort();
  const withSignals = allFiles.filter(rel=>{
    const info = statusMap.get(rel);
    if(!info) return false;
    return info.merge || info.staged || info.unstaged || info.untracked || (info.codes && info.codes.size);
  });
  const candidateFiles = withSignals.length ? withSignals : allFiles;
  const maxEntries = cfg?.projectTreeMaxEntries || 400;
  const limitedFiles = candidateFiles.slice(0, maxEntries);

  const root = createTreeNode('.', '', true);
  const seenPaths = new Set();
  const maxDepth = 20; // Prevent too deep trees

  limitedFiles.forEach(rel=>{
    // Prevent duplicates and circular references
    if(seenPaths.has(rel)) return;
    seenPaths.add(rel);

    const info = statusMap.get(rel);
    const parts = rel.split('/').filter(Boolean); // Remove empty parts
    if(!parts.length || parts.length > maxDepth) return;

    // Skip paths with suspicious patterns
    if(parts.some(part => !part || !part.trim() || part === '.' || part === '..' || part.startsWith(' ') || part.endsWith(' ') || part.length > 255)) return;

    let node = root;
    let depth = 0;
    parts.forEach((part, idx)=>{
      if(depth++ >= maxDepth) return; // Safety check
      const isLeaf = idx === parts.length - 1;
      const key = part;
      if(!node.children.has(key)){
        node.children.set(key, createTreeNode(part, node.fullPath ? `${node.fullPath}/${part}` : part, !isLeaf));
      }
      node = node.children.get(key);
      if(isLeaf){
        node.isDir = false;
        node.info = info ? cloneStatusInfo(info) : createStatusInfo();
      }
    });
  });

  propagateNodeFlags(root);
  const lines = [];
  const rootLabels = flagsToLabels(root.flags);
  const rootLine = rootLabels.length ? `./ ${rootLabels.map(label=>`[${label}]`).join(' ')}` : './';
  lines.push(rootLine.trim());
  renderTree(root, '', lines, maxEntries);
  return lines.slice(0, maxEntries);
}

function createStatusInfo(init){
  const base = { merge:false, staged:false, unstaged:false, untracked:false, codes:new Set() };
  if(init){
    base.merge = !!init.merge;
    base.staged = !!init.staged;
    base.unstaged = !!init.unstaged;
    base.untracked = !!init.untracked;
    if(init.codes){ Array.from(init.codes).forEach(code=>base.codes.add(code)); }
  }
  return base;
}

function cloneStatusInfo(info){
  return createStatusInfo(info);
}

function createTreeNode(name, fullPath, isDir){
  return {
    name,
    fullPath,
    isDir,
    children: new Map(),
    info: null,
    flags: createStatusInfo(),
    codes: new Set()
  };
}

function mergeFlags(target, source){
  if(!source) return target;
  target.merge = target.merge || !!source.merge;
  target.staged = target.staged || !!source.staged;
  target.unstaged = target.unstaged || !!source.unstaged;
  target.untracked = target.untracked || !!source.untracked;
  if(source.codes){
    Array.from(source.codes).forEach(code=> target.codes.add(code));
  }
  return target;
}

function propagateNodeFlags(node){
  if(node.info){
    mergeFlags(node.flags, node.info);
  }
  for(const child of node.children.values()){
    propagateNodeFlags(child);
    mergeFlags(node.flags, child.flags);
  }
}

function renderTree(node, prefix, lines, maxEntries, visited = new Set(), depth = 0){
  const maxDepth = 25; // Hard limit for rendering depth

  // Prevent circular reference in tree rendering
  if(visited.has(node.fullPath)) {
    lines.push(prefix + '(circular reference detected)');
    return;
  }

  // Prevent too deep trees
  if(depth >= maxDepth) {
    lines.push(prefix + '(max depth reached)');
    return;
  }

  visited.add(node.fullPath);

  const entries = Array.from(node.children.values()).sort(compareTreeNodes);
  const count = entries.length;
  entries.forEach((child, index)=>{
    if(lines.length >= maxEntries) return;
    const isLast = index === count - 1;
    const connector = isLast ? '└─ ' : '├─ ';
    const childPrefix = prefix + (isLast ? '   ' : '│  ');
    lines.push(prefix + connector + formatTreeNode(child));
    if(lines.length >= maxEntries) return;
    if(child.isDir && child.children.size){
      renderTree(child, childPrefix, lines, maxEntries, visited, depth + 1);
    }
  });
}

function compareTreeNodes(a, b){
  if(a.isDir !== b.isDir) return a.isDir ? -1 : 1;
  return a.name.localeCompare(b.name);
}

function formatTreeNode(node){
  const name = node.isDir ? `${node.name}/` : node.name;
  const labels = flagsToLabels(node.flags);
  if(!labels.length) return name;
  return `${name} ${labels.map(label=>`[${label}]`).join(' ')}`.trim();
}

function flagsToLabels(flags){
  const seen = new Set();
  if(flags?.merge) seen.add('Conflict');
  if(flags?.untracked) seen.add('New');
  if(flags?.unstaged) seen.add('Modified');
  if(flags?.staged) seen.add('Staged');
  if(flags?.codes){
    Array.from(flags.codes).forEach(code=>{
      const label = codeToLabel(code);
      if(label) seen.add(label);
    });
  }
  return Array.from(seen.values());
}

function codeToLabel(code){
  if(!code) return '';
  const c = String(code).charAt(0).toUpperCase();
  switch(c){
    case 'A': return 'New';
    case 'M': return 'Modified';
    case 'D': return 'Deleted';
    case 'R': return 'Renamed';
    case 'C': return 'Copied';
    case 'U': return 'Unmerged';
    default: return '';
  }
}

function parseNameStatusToMap(lines){
  const map = new Map();
  (lines||[]).forEach(line=>{
    if(!line) return;
    const parts = line.split('\t');
    if(parts.length < 2) return;
    const statusRaw = parts[0] || '';
    const statusCode = statusRaw.replace(/[0-9]/g, '') || statusRaw;
    let lastPath = parts[parts.length - 1];
    if(lastPath){
      // Remove git's quoting for special characters
      if(lastPath.startsWith('"') && lastPath.endsWith('"')){
        lastPath = lastPath.slice(1, -1);
        // Unescape git's octal sequences
        lastPath = lastPath.replace(/\\([0-7]{3})/g, (_, oct) => {
          return String.fromCharCode(parseInt(oct, 8));
        });
        lastPath = lastPath.replace(/\\([\\"])/g, '$1');
      }
      const normalized = lastPath.split('\\').join('/');
      // Skip invalid paths
      if(normalized.includes('//') || normalized.includes('/../') || normalized.startsWith('..')) return;
      map.set(normalized, statusCode.charAt(0).toUpperCase());
    }
  });
  return map;
}

function parseDiffByFile(diff){
  const result = {};
  if(!diff) return result;
  const lines = diff.split('\n');
  let currentFile = null;
  let buffer = [];
  const flush = ()=>{
    if(currentFile && buffer.length){
      result[currentFile] = buffer.join('\n');
    }
  };
  for(const line of lines){
    if(line.startsWith('diff --git ')){
      flush();
      buffer = [line];
      const match = line.match(/diff --git a\/(.*?) b\/(.*)/);
      currentFile = match ? match[2] : null;
    } else if(buffer){
      buffer.push(line);
    }
  }
  flush();
  return result;
}

function parseHunks(diff){
  const entries = [];
  if(!diff) return entries;
  const lines = diff.split('\n');
  let current = null;
  for(const line of lines){
    if(line.startsWith('diff --git ')){
      if(current) entries.push(current);
      const match = line.match(/diff --git a\/(.*?) b\/(.*)/);
      current = { file: match ? match[2] : '', hunks: [] };
    } else if(current && line.startsWith('@@ ')){
      const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
      if(match){
        const start = Number(match[1]);
        const count = match[2] ? Number(match[2]) : 1;
        current.hunks.push({ header: line, start, count });
      }
    }
  }
  if(current) entries.push(current);
  return entries;
}

function summariseFile(pathname, diffText){
  const change_kind = pathname.includes(' -> ') ? 'renamed' : 'modified';
  const symbols_changed = extractSymbols(diffText);
  const intent_guess = detectIntent(diffText);
  let high_level = 'auto-summary unavailable';
  if(intent_guess === 'bugfix') high_level = 'potential bug fix indicators detected';
  else if(intent_guess === 'perf') high_level = 'performance-oriented change';
  else if(intent_guess === 'refactor') high_level = 'structural refactor indications';
  else if(intent_guess === 'style') high_level = 'formatting adjustments';
  const risk = intent_guess === 'bugfix' ? 'medium' : 'unknown';
  return { path: pathname, change_kind, symbols_changed, high_level, intent_guess, risk };
}

function collectOpenTabs(cwd, limit){
  const max = Math.max(0, Number(limit) || 0);
  if(max === 0) return [];
  const entries = new Map();
  const order = [];
  const toRel = (uri)=>{
    if(!uri?.fsPath) return null;
    const rel = path.relative(cwd, uri.fsPath);
    if(!rel || rel.startsWith('..')) return null;
    return rel || '.';
  };

  const record = (label, meta)=>{
    if(!label) return;
    if(!entries.has(label)){
      entries.set(label, new Set());
      order.push(label);
    }
    const set = entries.get(label);
    (meta||[]).filter(Boolean).forEach(tag=> set.add(tag));
  };

  const describeTab = (tab)=>{
    if(!tab) return null;
    const input = tab.input;
    const candidate = input?.uri || input?.modified || input?.original || input?.notebookUri || null;
    const label = toRel(candidate) || tab.label;
    if(!label) return null;
    const meta = [];
    if(tab.isActive) meta.push('Active');
    if(tab.isDirty) meta.push('Dirty');
    if(tab.isPinned) meta.push('Pinned');
    if(tab.isPreview) meta.push('Preview');
    return { label, meta };
  };

  const groups = vscode.window.tabGroups?.all || [];
  const activeGroup = vscode.window.tabGroups?.activeTabGroup;
  if(activeGroup){
    activeGroup.tabs.forEach(tab=>{
      const info = describeTab(tab);
      if(info) record(info.label, info.meta);
    });
  }
  groups.forEach(group=>{
    if(group === activeGroup) return;
    group.tabs.forEach(tab=>{
      const info = describeTab(tab);
      if(info) record(info.label, info.meta);
    });
  });

  (vscode.window.visibleTextEditors||[]).forEach(editor=>{
    const label = toRel(editor.document?.uri) || editor.document?.fileName || editor.document?.uri?.toString();
    if(!label) return;
    const meta = [];
    if(editor.document?.isDirty) meta.push('Dirty');
    if(editor === vscode.window.activeTextEditor && !meta.includes('Active')) meta.push('Active');
    record(label, meta);
  });

  const list = order.map(label=>{
    const meta = Array.from(entries.get(label).values());
    return meta.length ? `${label} [${meta.join(', ')}]` : label;
  });

  return list.slice(0, max);
}

async function collectHeavyDiffSnapshots(cwd, hunks, cfg){
  const maxFiles = Math.max(0, Number(cfg?.heavyDiffMaxFiles) || 0);
  if(maxFiles === 0) return [];
  const maxLines = Math.max(10, Number(cfg?.heavyDiffMaxLines) || 500);
  const snapshots = [];
  const seen = new Set();
  for(const entry of hunks){
    const filePath = entry?.file;
    if(!filePath || seen.has(filePath)) continue;
    if(!Array.isArray(entry.hunks) || entry.hunks.length < 3) continue;
    const content = await readStagedFile(cwd, filePath);
    if(!content) continue;
    const truncated = content.split(/\r?\n/).slice(0, maxLines).join('\n');
    snapshots.push({ path: filePath, content: truncated });
    seen.add(filePath);
    if(snapshots.length >= maxFiles) break;
  }
  return snapshots;
}

async function readStagedFile(cwd, relPath){
  if(!relPath) return '';
  try {
    const { stdout } = await execFile('git', ['show', `:${relPath}`], cwd);
    if(stdout && !stdout.includes('\u0000')) return stdout;
  } catch {
    // fall through
  }
  try {
    const abs = path.join(cwd, relPath);
    if(fs.existsSync(abs)){
      const data = fs.readFileSync(abs, 'utf8');
      if(data && !data.includes('\u0000')) return data;
    }
  } catch {
    // ignore
  }
  return '';
}

async function collectHistoryForFiles(cwd, files, limit){
  const maxTotal = Math.max(1, Number(limit) || 1);
  const perFile = Math.min(maxTotal, 25);
  const results = [];
  const seen = new Set();
  for(const file of files){
    if(!file) continue;
    try {
      const { stdout } = await execFile('git', ['log','--pretty=%s','-n', String(perFile),'--', file], cwd);
      stdout.split('\n').map(x=>x.trim()).filter(Boolean).forEach(line=>{
        if(seen.has(line) || !line) return;
        seen.add(line);
        results.push(line);
      });
      if(results.length >= maxTotal) break;
    } catch {
      // ignore
    }
  }
  return results.slice(0, maxTotal);
}

function detectTestChanges(nameStatusLines){
  return nameStatusLines.map(line=>{
    const parts = line.split('\t');
    if(parts.length < 2) return null;
    const status = parts[0];
    const target = parts[parts.length-1];
    if(/test|spec/i.test(target)){
      return { path: target, change: `status=${status}` };
    }
    return null;
  }).filter(Boolean);
}

async function collectContext(repo, cfg){
  const cwd = repo.rootUri.fsPath;
  const commitLanguage = normaliseLanguagePreference(cfg?.commitLanguage);
  const [diffNameStatus, diffUnifiedRaw, diffUnifiedZeroRaw, branch, remoteUrl, defaultBranchRef] = await Promise.all([
    runGit(cwd, ['diff','--name-status','--cached','--find-renames','--relative'], true),
    runGit(cwd, ['diff','--staged','--find-renames','--unified=3'], true),
    runGit(cwd, ['diff','--staged','--find-renames','--unified=0'], true),
    runGit(cwd, ['rev-parse','--abbrev-ref','HEAD'], true),
    runGit(cwd, ['remote','get-url','origin'], true),
    runGit(cwd, ['symbolic-ref','refs/remotes/origin/HEAD'], true)
  ]);

  const diffUnified = diffUnifiedRaw.length > cfg.maxPatchBytes ? diffUnifiedRaw.slice(0, cfg.maxPatchBytes) : diffUnifiedRaw;
  const diffUnifiedZero = diffUnifiedZeroRaw.length > cfg.maxPatchBytes ? diffUnifiedZeroRaw.slice(0, cfg.maxPatchBytes) : diffUnifiedZeroRaw;

  const currentBranch = branch || 'HEAD';
  const defaultBranch = defaultBranchRef ? defaultBranchRef.split('/').pop() : 'main';
  const repoName = remoteUrl ? path.basename(remoteUrl.replace(/\.git$/,'')) : path.basename(cwd);
  const lsFiles = await runGit(cwd, ['ls-files'], true);
  const trackedFiles = lsFiles ? lsFiles.split('\n').filter(Boolean) : [];
  const languages = parseLanguages(trackedFiles);
  const serviceMap = buildServiceMap(trackedFiles);
  const branchHints = parseBranchHints(currentBranch);

  const nameStatusLines = diffNameStatus ? diffNameStatus.split('\n').filter(Boolean) : [];
  const stagedStatusMap = parseNameStatusToMap(nameStatusLines);
  const fileDiffs = parseDiffByFile(diffUnified);
  const heavyHunks = parseHunks(diffUnifiedZero);
  const previousCommits = await collectHistoryForFiles(cwd, Object.keys(fileDiffs), cfg.previousCommitLimit);
  const heavyDiffSnapshots = await collectHeavyDiffSnapshots(cwd, heavyHunks, cfg);
  const openTabs = collectOpenTabs(cwd, cfg.openTabsLimit);
  setTerminalBufferHardLimit(Math.max(cfg.terminalLogLines * 5, 200));
  const terminalRecent = getTerminalSnapshot(cfg.terminalLogLines);

  const fileSummaries = Object.entries(fileDiffs).map(([file, diff])=> summariseFile(file, diff));

  const context = {
    repo_meta: {
      repo_name: repoName,
      default_branch: defaultBranch,
      current_branch: currentBranch,
      commit_language: commitLanguage,
      languages,
      commit_convention: 'Conventional Commits',
      service_map: serviceMap
    },
    intent_signals: {
      branch_hints: branchHints,
      recent_test_failures: [],
      linter_type_errors: [],
      related_issues_summary: [],
      previous_commits_touching_same_symbols: previousCommits
    },
    file_summaries: fileSummaries,
    ast_impact: {
      public_endpoints_changed: [],
      breaking_candidates: []
    },
    routes_schema_changes: [],
    db_schema_changes: [],
    test_changes: detectTestChanges(nameStatusLines),
    diffs: diffUnified,
    project_tree: await buildProjectTree(repo, cwd, cfg, stagedStatusMap),
    open_tabs: openTabs,
    terminal_recent: terminalRecent,
    heavy_diff_snapshots: heavyDiffSnapshots
  };

  lastContext = context;
  return context;
}

function buildUserPrompt(context){
  const meta = context.repo_meta;
  const intent = context.intent_signals;
  const commitLanguage = meta.commit_language || 'auto';
  const fileSummariesJson = JSON.stringify(context.file_summaries, null, 2);
  const astImpactJson = JSON.stringify(context.ast_impact, null, 2);
  const routesJson = JSON.stringify(context.routes_schema_changes, null, 2);
  const dbJson = JSON.stringify(context.db_schema_changes, null, 2);
  const testsJson = JSON.stringify(context.test_changes, null, 2);
  const projectTree = (context.project_tree || []).join('\n');
  const openTabs = (context.open_tabs || []).join('\n');
  const terminalRecent = (context.terminal_recent || []).join('\n');
  const heavySnapshots = (context.heavy_diff_snapshots || []).map(entry=> {
    const header = `# ${entry.path}`;
    const body = entry.content || '';
    return `${header}\n${body}`;
  }).join('\n\n');

  return `<instructions>
Analyze the repository context and staged diffs. Identify every significant, user-visible change and gather the literal values (versions, configuration keys, renamed resources).
</instructions>

<context>
<repo_meta>
<repo_name>${meta.repo_name}</repo_name>
<default_branch>${meta.default_branch}</default_branch>
<current_branch>${meta.current_branch}</current_branch>
<commit_language>${commitLanguage}</commit_language>
<languages>${JSON.stringify(meta.languages)}</languages>
<commit_convention>Conventional Commits</commit_convention>
<service_map>${JSON.stringify(meta.service_map)}</service_map>
</repo_meta>

<intent_signals>
<branch_hints>${JSON.stringify(intent.branch_hints)}</branch_hints>
<recent_test_failures>${JSON.stringify(intent.recent_test_failures)}</recent_test_failures>
<linter_type_errors>${JSON.stringify(intent.linter_type_errors)}</linter_type_errors>
<related_issues>${JSON.stringify(intent.related_issues_summary)}</related_issues>
<previous_commits>${JSON.stringify(intent.previous_commits_touching_same_symbols)}</previous_commits>
</intent_signals>

<project_tree>
${projectTree || '(empty)'}
</project_tree>

<open_tabs>
${openTabs || '(none)'}
</open_tabs>

<terminal_recent>
${terminalRecent || '(none)'}
</terminal_recent>

<file_summaries>
${fileSummariesJson}
</file_summaries>

<diffs>
${context.diffs}
</diffs>

<heavy_diff_snapshots>
${heavySnapshots || '(none)'}
</heavy_diff_snapshots>

<ast_impact>
${astImpactJson}
</ast_impact>

<routes_schema_changes>
${routesJson}
</routes_schema_changes>

<db_schema_changes>
${dbJson}
</db_schema_changes>

<test_changes>
${testsJson}
</test_changes>
</context>

<task>
Produce one commit_message JSON object that satisfies the schema referenced by the system prompt and COMMIT_RESPONSE_FORMAT.
- Choose the commit type per the provided rules (feat for DX/capability gains, fix for bug remediation, chore for routine maintenance) unless another allowed type better matches the dominant change.
- Pick the most representative scope token (single lowercase module/folder name) or "" when ambiguous.
- Craft the subject in the requested language, combine all primary changes in one sentence, and embed explicit values (version changes, renamed services, configuration keys and new values).
- Emit the body as a JSON array of terse fragments in the requested language (e.g., "env config cleanup"), one per significant change, each naming the concrete artifact/key/value and omitting terminal punctuation.
- Cover every significant change surfaced in the context without inventing data or repeating git metadata.
- Ignore the languages used in previous commits or diffs; the subject, body, and rationale must obey the requested language_instruction exactly. If compliance is impossible, emit LANGUAGE_POLICY_VIOLATION per the language_instruction guidance.
</task>`;
}

function buildCommitMessage(parsed){
  const type = (parsed.type || '').trim();
  if(!ALLOWED_TYPES.includes(type)) throw new Error('Model returned unsupported type.');
  const scope = (parsed.scope || '').trim();
  const subject = (parsed.subject || '').trim();
  if(!subject) throw new Error('Model returned empty subject.');
  const header = scope ? `${type}(${scope}): ${subject}` : `${type}: ${subject}`;
  const lines = [header];
  const bodyField = parsed.body;
  let bodyBlock = '';
  if(Array.isArray(bodyField)){
    const normalized = bodyField.map(entry=> (entry || '').toString().trim()).filter(Boolean);
    if(normalized.length){
      bodyBlock = normalized.map(sentence=> sentence.startsWith('- ') ? sentence : `- ${sentence}`).join('\n');
    }
  }else if(typeof bodyField === 'string'){
    const trimmed = bodyField.trim();
    if(trimmed){
      const sentences = trimmed.split(/\r?\n/).map(line=> line.trim()).filter(Boolean);
      bodyBlock = sentences.map(sentence=> sentence.startsWith('- ') ? sentence : `- ${sentence}`).join('\n');
    }
  }
  if(bodyBlock) lines.push(bodyBlock);
  const footer = [];
  if(parsed.breaking_change){ footer.push(`BREAKING CHANGE: ${parsed.breaking_change}`); }
  if(Array.isArray(parsed.issues)) parsed.issues.filter(Boolean).forEach(issue=> footer.push(issue));
  if(footer.length) lines.push('', footer.join('\n'));
  return lines.join('\n');
}

function isResponses(url){ try { return new URL(url).pathname.includes('/responses'); } catch { return false; } }
function toResponses(messages){
  return messages.map(m => ({ type:'message', role:m.role, content:[{ type:'input_text', text:String(m.content) }] }));
}
function pickFromResponses(resp){
  try { const msg = (resp?.output||[]).find(x => x.type==='message'); return msg ? msg.content.map(p=>p.text||p.delta||'').join('') : ''; } catch { return ''; }
}
function pickFromCompletions(resp){
  try {
    const ch = resp?.choices?.[0]; const m = ch?.message;
    if(typeof m?.content === 'string') return m.content;
    if(Array.isArray(m?.content)) return m.content.map(x=>x.text||x).join('');
    return '';
  } catch { return ''; }
}

function coerceResponse(response){
  if(typeof response === 'string') return response;
  if(isResponsesObject(response)){
    return pickFromResponses(response) || response.output_text || JSON.stringify(response);
  }
  if(response?.choices){
    return pickFromCompletions(response) || JSON.stringify(response);
  }
  return JSON.stringify(response);
}

function isResponsesObject(obj){
  try { return !!obj && Array.isArray(obj.output); } catch { return false; }
}

async function httpPost(cfg, payload, prompts){
  lastPayload = payload;
  lastPayload.__meta = { prompts };
  show();
  const stamp = new Date().toISOString();
  log(`[info] ${stamp} model=${cfg.model}`);
  log(`[info] endpoint=${cfg.endpoint}`);

  const maxChars = cfg.logPromptMaxChars || 0;
  if(prompts?.system){
    const systemContent = maxChars > 0 ? prompts.system.slice(0, maxChars) : prompts.system;
    logSection('system', systemContent);
    if(maxChars > 0 && prompts.system.length > maxChars){
      log(`... (truncated ${prompts.system.length - maxChars} chars)`);
    }
  }
  if(prompts?.user){
    const userContent = maxChars > 0 ? prompts.user.slice(0, maxChars) : prompts.user;
    logSection('user', userContent);
    if(maxChars > 0 && prompts.user.length > maxChars){
      log(`... (truncated ${prompts.user.length - maxChars} chars)`);
    }
  }

  const headers = {
    'Authorization': `Bearer ${cfg.apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': cfg.referer,
    'X-Title': cfg.title,
    'Accept': 'application/json'
  };

  async function viaFetch(){
    const controller = new AbortController();
    const t = setTimeout(()=>controller.abort(), cfg.timeoutMs);
    try {
      const res = await fetch(cfg.endpoint, { method:'POST', headers, body: JSON.stringify(payload), signal: controller.signal });
      const text = await res.text();
      if(cfg.logRaw) logSection('response', text.slice(0, 1000));
      if(!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 400)}`);
      const ct = res.headers.get('content-type') || '';
      if(!ct.includes('json')) return text;
      try { return JSON.parse(text); } catch { return text; }
    } finally { clearTimeout(t); }
  }

  async function viaCurl(){
    const tmp = path.join(os.tmpdir(), `kars-commit-ai-${Date.now()}.json`);
    fs.writeFileSync(tmp, JSON.stringify(payload));
    const cmd = [
      'curl','-sS','-L','--max-time', String(Math.ceil(cfg.timeoutMs/1000)),
      '-H', `"Authorization: Bearer ${cfg.apiKey}"`,
      '-H', '"Content-Type: application/json"',
      '-H', `"HTTP-Referer: ${cfg.referer}"`,
      '-H', `"X-Title: ${cfg.title}"`,
      '-H', '"Accept: application/json"',
      '-d', '@'+tmp,
      cfg.endpoint
    ].join(' ');
    const { stdout } = await exec(cmd, process.cwd());
    if(cfg.logRaw) logSection('response', String(stdout).slice(0,1000));
    try { return JSON.parse(stdout); } catch { return stdout; }
  }

  if (cfg.transport === 'curl') return await viaCurl();
  return await viaFetch();
}

async function generate(){
  try{
    const api = await getGitAPI();
    const repo = api.repositories[0];
    if(!repo) return vscode.window.showErrorMessage('No Git repository open');
    const stagedOk = await ensureStagedOrOfferStageAll(repo);
    if(!stagedOk) { log('Aborted: no staged changes.'); return; }

    const cfg = getConfig();
    if(!cfg.apiKey) return vscode.window.showErrorMessage('Set karsCommitAI.apiKey first');

    const context = await collectContext(repo, cfg);
    const baseSystemPrompt = cfg.systemPrompt || SYSTEM_PROMPT;
    const languageInstruction = buildLanguageInstruction(cfg.commitLanguage);
    const systemPrompt = languageInstruction ? `${baseSystemPrompt}\n${languageInstruction}` : baseSystemPrompt;
    const userPrompt = buildUserPrompt(context);

    const payload = isResponses(cfg.endpoint)
      ? { model: cfg.model, input: toResponses([{role:'system',content:systemPrompt},{role:'user',content:userPrompt}]), temperature: 0.2, max_output_tokens: 800 }
      : { model: cfg.model, messages: [{role:'system',content:systemPrompt},{role:'user',content:userPrompt}], temperature: 0.2 };

    payload.response_format = COMMIT_RESPONSE_FORMAT;

    const rawResponse = await httpPost(cfg, payload, { system: systemPrompt, user: userPrompt });
    const text = coerceResponse(rawResponse);
    logSection('model-output', text);
    const parsed = parseJSONSafely(text);
    if(!parsed){
      vscode.window.showErrorMessage('Model response was not valid JSON. See output for details.');
      return;
    }
    const commitMessage = buildCommitMessage(parsed);
    repo.inputBox.value = commitMessage;
    if(parsed.rationale) logSection('rationale', parsed.rationale);
  }catch(e){
    log('Commit AI failed: ' + (e?.message || e));
    vscode.window.showErrorMessage('Commit AI failed: ' + (e?.message || e));
  }
}

async function ping(){
  try{
    const cfg = getConfig();
    const url = 'https://openrouter.ai/api/v1/models';
    const res = await fetch(url, { method:'GET', headers: { 'Authorization': `Bearer ${cfg.apiKey}`, 'Accept': 'application/json' } });
    const text = await res.text();
    log(`Ping GET ${url} -> ${res.status}`);
    log(text.slice(0, 400));
    vscode.window.showInformationMessage(`OpenRouter ping: ${res.ok ? 'OK' : ('Failed ' + res.status)}`);
  }catch(e){
    log('Ping failed: ' + (e?.message || e));
    vscode.window.showErrorMessage('Ping failed: ' + (e?.message || e));
  }
}

function showLast(){
  const content = JSON.stringify({ payload:lastPayload, context:lastContext }, null, 2);
  vscode.workspace.openTextDocument({ content, language: 'json' }).then(doc => vscode.window.showTextDocument(doc, { preview:false }));
}

function activate(context){
  log('Kars Commit AI activated at ' + new Date().toISOString());
  // Terminal capture removed: onDidWriteTerminalData requires proposed API
  context.subscriptions.push(vscode.commands.registerCommand('karsCommitAI.generate', generate));
  context.subscriptions.push(vscode.commands.registerCommand('karsCommitAI.pingOpenRouter', ping));
  context.subscriptions.push(vscode.commands.registerCommand('karsCommitAI.showLastPayload', showLast));
}

function deactivate(){}

module.exports = { activate, deactivate };
