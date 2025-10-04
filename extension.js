const vscode = require('vscode');
const cp = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

let out;
let lastPayload = null;
let lastContext = null;

function log(...args){ (out||=vscode.window.createOutputChannel('Kars Commit AI')).appendLine(args.join(' ')); }
function show(){ (out||=vscode.window.createOutputChannel('Kars Commit AI')).show(true); }
function logSection(title, body){ log(`[${title}]`); (body||'').split(/\r?\n/).forEach(line=>log(line)); }

const SYSTEM_PROMPT = `You are a senior software engineer who writes precise Conventional Commits.
Goal: infer the author's real intent behind code changes and produce a commit message that explains WHAT changed and, more importantly, WHY it changed.

Constraints:
- Use Conventional Commits: {type}({scope}): {subject}
- Allowed types: feat, fix, perf, refactor, style, docs, test, build, ci, chore, revert.
- Subject: imperative mood, ≤ 72 chars, no trailing period, British English spelling.
- Scope: derive from top-level package/folder or service name (e.g., api, web, infra).
- Body: 1–4 lines. Focus on 'why' and trade-offs; mention risk or impact plainly.
- Footer: 
  - 'BREAKING CHANGE:' if any public API/contract change.
  - Issue links (e.g., Closes #123) when reliably detected.
Hard rules:
- Do not hallucinate tickets or metrics. If unsure, omit.
- If changes are purely formatting or comments: use style/chore with concise subject.
- Prefer fix over refactor when the change is motivated by a bug/test failure.
- Prefer perf when the change measurably reduces complexity or allocations/queries.
Output format:
- Return JSON with fields: {type, scope, subject, body, breaking_change, issues, rationale}.
- 'rationale' is a terse 1–3 sentence audit note and is NOT part of the commit message.`;

const ALLOWED_TYPES = ['feat','fix','perf','refactor','style','docs','test','build','ci','chore','revert'];

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
    systemPrompt: (compat ? compat + '\n\n' : '') + (c.get('karsCommitAI.systemPrompt') || SYSTEM_PROMPT)
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

async function buildProjectTree(repo, cwd){
  const trackedRes = await execFile('git', ['ls-files'], cwd).catch(()=>({ stdout:'' }));
  const untrackedRes = await execFile('git', ['ls-files','--others','--exclude-standard'], cwd).catch(()=>({ stdout:'' }));
  const normalize = (p)=>p.split('\\').join('/');
  const tracked = trackedRes.stdout.split('\n').map(x=>x.trim()).filter(Boolean).map(normalize);
  const untracked = untrackedRes.stdout.split('\n').map(x=>x.trim()).filter(Boolean).map(normalize);
  const statusMap = new Map();
  const ensure = (rel)=>{ if(!statusMap.has(rel)) statusMap.set(rel, { staged:false, unstaged:false, merge:false, untracked:false }); return statusMap.get(rel); };

  const addChanges = (changes, key)=>{
    (changes||[]).forEach(change=>{
      const uri = change.originalUri?.fsPath || change.resourceUri?.fsPath || change.uri?.fsPath;
      if(!uri) return;
      const rel = path.relative(cwd, uri);
      if(!rel || rel.startsWith('..')) return;
      const norm = normalize(rel);
      ensure(norm)[key] = true;
    });
  };

  addChanges(repo.state.indexChanges, 'staged');
  addChanges(repo.state.workingTreeChanges, 'unstaged');
  addChanges(repo.state.mergeChanges, 'merge');
  untracked.forEach(rel=>{ ensure(rel).untracked = true; });

  const files = Array.from(new Set([...tracked, ...untracked, ...statusMap.keys()])).sort();
  return files.slice(0, 400).map(rel=>{
    const info = statusMap.get(rel);
    const flags = [];
    if(info){
      if(info.merge) flags.push('M');
      if(info.staged) flags.push('S');
      if(info.unstaged) flags.push('W');
      if(info.untracked) flags.push('?');
    }
    const marker = flags.length ? flags.join('') : 'C';
    return `${marker} ${rel}`;
  });
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

async function collectBlameContexts(cwd, hunks){
  const results = [];
  for(const entry of hunks){
    const filePath = entry.file;
    if(!filePath) continue;
    for(const hunk of entry.hunks){
      const start = Math.max(hunk.start - 2, 1);
      const end = hunk.start + Math.max(hunk.count, 1) + 2;
      try {
        const { stdout } = await execFile('git', ['blame', `-L`, `${start},${end}`, '--', filePath], cwd);
        results.push({ path: filePath, hunk: hunk.header, blame_lines: stdout.split('\n').filter(Boolean) });
      } catch {
        // ignore new files
      }
    }
  }
  return results;
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

async function collectHistoryForFiles(cwd, files){
  const entries = new Set();
  for(const file of files){
    if(!file) continue;
    try {
      const { stdout } = await execFile('git', ['log','--pretty=%h %s','-n','3','--', file], cwd);
      stdout.split('\n').filter(Boolean).forEach(line=> entries.add(line));
    } catch {
      // ignore
    }
  }
  return Array.from(entries).slice(0, 3);
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
  const fileDiffs = parseDiffByFile(diffUnified);
  const blameEntries = parseHunks(diffUnifiedZero);
  const blameContext = await collectBlameContexts(cwd, blameEntries);
  const previousCommits = await collectHistoryForFiles(cwd, Object.keys(fileDiffs));

  const fileSummaries = Object.entries(fileDiffs).map(([file, diff])=> summariseFile(file, diff));

  const context = {
    repo_meta: {
      repo_name: repoName,
      default_branch: defaultBranch,
      current_branch: currentBranch,
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
    blame_context: blameContext,
    project_tree: await buildProjectTree(repo, cwd)
  };

  lastContext = context;
  return context;
}

function buildUserPrompt(context){
  const meta = context.repo_meta;
  const intent = context.intent_signals;
  const fileSummariesJson = JSON.stringify(context.file_summaries, null, 2);
  const astImpactJson = JSON.stringify(context.ast_impact, null, 2);
  const routesJson = JSON.stringify(context.routes_schema_changes, null, 2);
  const dbJson = JSON.stringify(context.db_schema_changes, null, 2);
  const testsJson = JSON.stringify(context.test_changes, null, 2);
  const blameJson = JSON.stringify(context.blame_context, null, 2);
  const projectTree = (context.project_tree || []).join('\n');

  return `Analyse the following repository context and staged diffs to infer intent and produce a commit message.

REPO_META
- repo_name: ${meta.repo_name}
- default_branch: ${meta.default_branch}
- current_branch: ${meta.current_branch}
- languages: ${JSON.stringify(meta.languages)}
- commit_convention: Conventional Commits
- service_map: ${JSON.stringify(meta.service_map)}

INTENT_SIGNALS
- branch_hints: ${JSON.stringify(intent.branch_hints)}
- recent_test_failures: ${JSON.stringify(intent.recent_test_failures)}
- linter_type_errors: ${JSON.stringify(intent.linter_type_errors)}
- related_issues: ${JSON.stringify(intent.related_issues_summary)}
- previous_commits_touching_same_symbols: ${JSON.stringify(intent.previous_commits_touching_same_symbols)}

PROJECT_TREE
${projectTree || '(empty)'}

FILE_SUMMARIES
${fileSummariesJson}

DIFFS
${context.diffs}

BLAME_CONTEXT
${blameJson}

AST_IMPACT
${astImpactJson}

ROUTES_SCHEMA_CHANGES
${routesJson}

DB_SCHEMA_CHANGES
${dbJson}

TEST_CHANGES
${testsJson}

Generate JSON: {type, scope, subject, body, breaking_change, issues, rationale}.`;
}

function buildCommitMessage(parsed){
  const type = (parsed.type || '').trim();
  if(!ALLOWED_TYPES.includes(type)) throw new Error('Model returned unsupported type.');
  const scope = (parsed.scope || '').trim();
  const subject = (parsed.subject || '').trim();
  if(!subject) throw new Error('Model returned empty subject.');
  const header = scope ? `${type}(${scope}): ${subject}` : `${type}: ${subject}`;
  const lines = [header];
  const body = (parsed.body || '').trim();
  if(body) lines.push('', body);
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
  if(prompts?.system) logSection('system', prompts.system);
  if(prompts?.user) logSection('user', prompts.user.slice(0, 2000));

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
      if(cfg.logRaw) logSection('raw-head', text.slice(0, 1000));
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
    if(cfg.logRaw) logSection('raw-head', String(stdout).slice(0,1000));
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
    const systemPrompt = cfg.systemPrompt || SYSTEM_PROMPT;
    const userPrompt = buildUserPrompt(context);

    const payload = isResponses(cfg.endpoint)
      ? { model: cfg.model, input: toResponses([{role:'system',content:systemPrompt},{role:'user',content:userPrompt}]), temperature: 0.2, max_output_tokens: 800 }
      : { model: cfg.model, messages: [{role:'system',content:systemPrompt},{role:'user',content:userPrompt}], temperature: 0.2 };

    const rawResponse = await httpPost(cfg, payload, { system: systemPrompt, user: userPrompt });
    const text = coerceResponse(rawResponse);
    logSection('model-output', text.slice(0, 2000));
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
  context.subscriptions.push(vscode.commands.registerCommand('karsCommitAI.generate', generate));
  context.subscriptions.push(vscode.commands.registerCommand('karsCommitAI.pingOpenRouter', ping));
  context.subscriptions.push(vscode.commands.registerCommand('karsCommitAI.showLastPayload', showLast));
}

function deactivate(){}

module.exports = { activate, deactivate };
