#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

// create-flutter-clean-base
// Scaffold a new Flutter Clean Architecture + BLoC app from the private
// `flutter-clean-base` template — like create-react-app / create-next-app.
//
//   npx github:dotuananhtb/flutter my_app
//
// Clones the template via `gh` (uses your GitHub auth), then renames the Dart
// package, bundle id, app name and resets git. Works on any machine where you
// are logged in to GitHub (gh) and have Flutter installed.

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const { spawnSync } = require('child_process');

const TEMPLATE_DEFAULT = 'dotuananhtb/flutter-clean-base';
const TOKENS = {
  pkg: 'flutter_clean_base', // Dart package name in the template
  bundle: 'com.example.fluttercleanbase', // applicationId / bundle id in the template
  display: 'Clean Base', // app display name in the template
};

// ── tiny ansi helpers ──────────────────────────────────────────────────────
const tty = process.stdout.isTTY;
const c = (n) => (s) => (tty ? `\x1b[${n}m${s}\x1b[0m` : String(s));
const bold = c(1);
const dim = c(2);
const red = c(31);
const green = c(32);
const yellow = c(33);
const cyan = c(36);

const log = (s = '') => console.log(s);
const step = (s) => console.log(cyan('▸ ') + s);
const ok = (s) => console.log(green('✓ ') + s);
const warn = (s) => console.log(yellow('! ') + s);
function die(msg) {
  console.error('\n' + red('✗ ') + msg + '\n');
  process.exit(1);
}

// ── arg parsing ─────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const opts = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') opts.help = true;
    else if (a === '-y' || a === '--yes') opts.yes = true;
    else if (a === '--no-install') opts.install = false;
    else if (a === '--no-ck') opts.ck = false;
    else if (a === '--codegen') opts.codegen = true;
    else if (a === '--org') opts.org = argv[++i];
    else if (a === '--bundle') opts.bundle = argv[++i];
    else if (a === '--name') opts.name = argv[++i];
    else if (a === '--ref') opts.ref = argv[++i];
    else if (a === '--template') opts.template = argv[++i];
    else if (a.startsWith('--')) die(`Unknown option: ${a}`);
    else opts._.push(a);
  }
  return opts;
}

function usage() {
  log(`
${bold('create-flutter-clean-base')} — scaffold a Flutter Clean Architecture + BLoC app

${bold('Usage')}
  npx github:dotuananhtb/flutter ${cyan('<project_name>')} [options]

${bold('Arguments')}
  project_name           Dart package name (lowercase, snake_case)

${bold('Options')}
  --bundle <id>          applicationId / bundle id (default com.example.<name>)
  --org <reverse-domain> Org prefix for the default bundle (default com.example)
  --name "<Display>"     App display name (default: Title Case of project_name)
  --ref <branch>         Template branch/tag to use (default main)
  --template <owner/repo> Template repo (default ${TEMPLATE_DEFAULT})
  --no-install           Skip "flutter pub get"
  --no-ck                Skip ClaudeKit activation (CLI install + connector check)
  --codegen              Also run build_runner (needs the pinned Flutter)
  -y, --yes              Accept all defaults, no prompts
  -h, --help             Show this help

${bold('Examples')}
  npx github:dotuananhtb/flutter my_app
  npx github:dotuananhtb/flutter my_app --bundle com.acme.myapp --name "My App"
`);
}

// ── prompt ──────────────────────────────────────────────────────────────────
function ask(question, def) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const suffix = def ? dim(` (${def})`) : '';
    rl.question(`${cyan('?')} ${question}${suffix} `, (answer) => {
      rl.close();
      resolve((answer || '').trim() || def || '');
    });
  });
}

// ── validation / derivation ──────────────────────────────────────────────────
const RESERVED = new Set([
  'flutter', 'test', 'dart', 'this', 'class', 'void', 'new', 'true', 'false', 'null',
]);
function validPackage(name) {
  return /^[a-z][a-z0-9_]*$/.test(name) && !RESERVED.has(name);
}
function validBundle(id) {
  return /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(id);
}
function titleCase(snake) {
  return snake
    .split('_')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

// ── shell helpers ─────────────────────────────────────────────────────────────
function has(cmd) {
  const r = spawnSync(cmd, ['--version'], { stdio: 'ignore' });
  return r.status === 0 || r.status === 1; // some tools exit 1 on --version
}
function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (r.status !== 0) {
    die(`Command failed: ${cmd} ${args.join(' ')}`);
  }
}
function runQuiet(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { encoding: 'utf8', ...opts });
}

// ── file ops ──────────────────────────────────────────────────────────────────
function replaceInFile(file, pairs) {
  if (!fs.existsSync(file)) return;
  let s = fs.readFileSync(file, 'utf8');
  for (const [from, to] of pairs) s = s.split(from).join(to);
  fs.writeFileSync(file, s);
}
function walk(dir, fn) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, fn);
    else fn(full);
  }
}
function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) return usage();

  log('\n' + bold(cyan('  Flutter Clean Base')) + dim('  · project scaffolder\n'));

  const interactive = process.stdin.isTTY && !opts.yes;

  // project name
  let project = opts._[0];
  if (!project && interactive) project = await ask('Project name (snake_case)?', 'my_app');
  if (!project) die('Missing project name.\n  Try: npx github:dotuananhtb/flutter my_app');
  if (!validPackage(project)) {
    die(`Invalid project name "${project}".\n  Use lowercase letters, digits and underscores, starting with a letter (e.g. my_app).`);
  }

  // org / bundle
  const org = opts.org || 'com.example';
  let bundle = opts.bundle || `${org}.${project.replace(/_/g, '')}`;
  if (!opts.bundle && interactive) bundle = await ask('Bundle id / applicationId?', bundle);
  if (!validBundle(bundle)) die(`Invalid bundle id "${bundle}" (expected reverse-domain like com.acme.myapp).`);

  // display name
  let display = opts.name || titleCase(project);
  if (!opts.name && interactive) display = await ask('App display name?', display);
  if (display.includes('"')) die('App display name must not contain a double-quote.');

  // install?
  let install = opts.install !== false;
  if (interactive && opts.install === undefined) {
    const a = (await ask('Run "flutter pub get" now? (Y/n)', 'Y')).toLowerCase();
    install = a !== 'n' && a !== 'no';
  }

  const template = opts.template || TEMPLATE_DEFAULT;
  const ref = opts.ref || 'main';
  const target = path.resolve(process.cwd(), project);

  if (fs.existsSync(target)) die(`Target directory already exists: ${target}`);

  // summary
  log('');
  log(bold('  Scaffolding with:'));
  log(`    ${dim('project ')} ${project}`);
  log(`    ${dim('package ')} ${project} ${dim('(Dart)')}`);
  log(`    ${dim('bundle  ')} ${bundle}`);
  log(`    ${dim('app name')} ${display}`);
  log(`    ${dim('template')} ${template}@${ref}`);
  log(`    ${dim('target  ')} ${target}`);
  log('');

  // 1) clone template (private → use gh; fallback git)
  step(`Fetching template ${cyan(template)} …`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fcb-'));
  const clonedTo = path.join(tmp, 'tpl');
  let cloned = false;
  if (has('gh')) {
    const r = spawnSync('gh', ['repo', 'clone', template, clonedTo, '--', '--depth=1', '--branch', ref], { stdio: 'inherit' });
    cloned = r.status === 0;
  }
  if (!cloned) {
    warn('gh clone unavailable or failed — falling back to git over https');
    const r = spawnSync('git', ['clone', '--depth=1', '--branch', ref, `https://github.com/${template}.git`, clonedTo], { stdio: 'inherit' });
    cloned = r.status === 0;
  }
  if (!cloned) {
    rmrf(tmp);
    die(`Could not clone ${template}. Make sure you are logged in (gh auth login) and have access to the repo.`);
  }

  // 2) move into place, drop template git history + scaffolder
  fs.cpSync(clonedTo, target, { recursive: true });
  rmrf(tmp);
  rmrf(path.join(target, '.git'));

  // 3) rename Dart package
  step('Renaming Dart package …');
  replaceInFile(path.join(target, 'pubspec.yaml'), [
    [`name: ${TOKENS.pkg}`, `name: ${project}`],
  ]);
  for (const sub of ['lib', 'test']) {
    const d = path.join(target, sub);
    if (fs.existsSync(d)) {
      walk(d, (file) => {
        if (file.endsWith('.dart')) {
          replaceInFile(file, [[`package:${TOKENS.pkg}/`, `package:${project}/`]]);
        }
      });
    }
  }

  // 4) rename bundle id across native config + deep link templates
  step('Setting bundle id …');
  const bundleFiles = [
    'android/app/build.gradle.kts',
    'android/app/google-services.json.example',
    'ios/Runner.xcodeproj/project.pbxproj',
    'ios/Runner/Info.plist',
    'deeplink_configs/android/assetlinks.json',
    'deeplink_configs/ios/apple-app-site-association',
  ];
  for (const f of ['develop', 'qa', 'staging', 'production']) {
    bundleFiles.push(`ios/${f}.xcconfig`, `ios/Flutter/${f}.xcconfig`);
  }
  for (const rel of bundleFiles) {
    replaceInFile(path.join(target, rel), [[TOKENS.bundle, bundle]]);
  }

  // 5) rename app display name
  step('Setting app display name …');
  const nameFiles = ['android/app/build.gradle.kts', 'ios/Runner/Info.plist'];
  for (const f of ['develop', 'qa', 'staging', 'production']) {
    nameFiles.push(`ios/${f}.xcconfig`, `ios/Flutter/${f}.xcconfig`);
  }
  for (const rel of nameFiles) {
    replaceInFile(path.join(target, rel), [[TOKENS.display, display]]);
  }
  // Retitle the project's CLAUDE.md (template name → app display name)
  replaceInFile(path.join(target, 'CLAUDE.md'), [['Flutter Clean Base', display]]);

  // 6) move Kotlin MainActivity to the new package path
  step('Moving Android MainActivity package …');
  const ktRoot = path.join(target, 'android/app/src/main/kotlin');
  const oldKt = path.join(ktRoot, ...TOKENS.bundle.split('.'));
  const newKt = path.join(ktRoot, ...bundle.split('.'));
  if (fs.existsSync(path.join(oldKt, 'MainActivity.kt'))) {
    fs.mkdirSync(newKt, { recursive: true });
    fs.renameSync(path.join(oldKt, 'MainActivity.kt'), path.join(newKt, 'MainActivity.kt'));
    replaceInFile(path.join(newKt, 'MainActivity.kt'), [[`package ${TOKENS.bundle}`, `package ${bundle}`]]);
    // prune now-empty old dirs
    let d = oldKt;
    while (d.startsWith(ktRoot) && d !== ktRoot && fs.existsSync(d) && fs.readdirSync(d).length === 0) {
      fs.rmdirSync(d);
      d = path.dirname(d);
    }
  }

  // 7) fresh project README
  fs.writeFileSync(
    path.join(target, 'README.md'),
    `# ${display}\n\n` +
      `Flutter app scaffolded from [flutter-clean-base](https://github.com/${template}).\n\n` +
      '## Run\n\n' +
      '```bash\nflutter pub get\n' +
      'dart run build_runner build --delete-conflicting-outputs\n' +
      'flutter run --flavor develop -t lib/main_develop.dart\n```\n\n' +
      '## Docs\n\nSee [`docs/playbook/`](docs/playbook/README.md) for architecture, UI/UX and design-system guidelines.\n'
  );

  // 8) fresh git history
  step('Initializing git …');
  const gitOpts = { cwd: target, stdio: 'ignore' };
  spawnSync('git', ['init', '-q'], gitOpts);
  spawnSync('git', ['add', '-A'], gitOpts);
  spawnSync('git', ['commit', '-q', '-m', `chore: scaffold ${project} from flutter-clean-base`], gitOpts);

  // 9) install deps
  if (install) {
    step('Running flutter pub get …');
    const r = spawnSync('flutter', ['pub', 'get'], { cwd: target, stdio: 'inherit' });
    if (r.status !== 0) warn('flutter pub get failed — run it manually once Flutter is set up.');
    else if (opts.codegen) {
      step('Running build_runner …');
      const g = spawnSync('dart', ['run', 'build_runner', 'build', '--delete-conflicting-outputs'], { cwd: target, stdio: 'inherit' });
      if (g.status !== 0) warn('build_runner failed — make sure you use the pinned Flutter (see .fvmrc), then rerun it.');
    }
  }

  // 10) ClaudeKit activation — ensure the `ck` CLI + external-service connectors
  // The kit FILES are already baked into the template; here we make sure the
  // machine has the `ck` CLI and that the external-service connectors (Gemini,
  // Stitch, etc.) are wired. Connectors live globally in ~/.claude/.env and are
  // inherited by every project — you only configure them once per machine.
  if (opts.ck !== false) {
    step('Activating ClaudeKit (CLI + connectors) …');
    if (!has('ck')) {
      log(dim('  ck CLI not found — installing claudekit-cli globally …'));
      const i = spawnSync('npm', ['install', '-g', 'claudekit-cli'], { stdio: 'inherit' });
      if (i.status !== 0) warn('Could not install claudekit-cli — run manually: npm i -g claudekit-cli');
    }
    if (has('ck')) {
      const globalEnv = path.join(os.homedir(), '.claude', '.env');
      if (fs.existsSync(globalEnv)) {
        ok('External-service connectors found in ~/.claude/.env — inherited by this project.');
      } else {
        // Connectors are lazy: code skills work without them. Only needed when
        // you first use an external-AI skill — so just inform, never force.
        log(dim('  External-AI connectors are optional — code skills work without them.'));
        log(dim('  When you first use an AI skill (ai-artist, ai-multimodal, stitch), run once:'));
        log(dim('    ck setup --global'));
      }
    }
  }

  // done
  log('');
  ok(`Created ${bold(project)} at ${dim(target)}`);
  log('');
  log(bold('  Next steps:'));
  log(`    cd ${project}`);
  if (!install) log('    flutter pub get');
  log('    flutter run --flavor develop -t lib/main_develop.dart');
  log('');
  log(dim('  Tip: open docs/playbook/README.md for the architecture guide.'));
  log('');
}

main().catch((e) => die(e && e.stack ? e.stack : String(e)));
