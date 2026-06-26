# create-flutter-clean-base

CLI to scaffold a new Flutter app from a template.

## Usage

```bash
npx github:dotuananhtb/flutter <app_name>
```

The command then asks for:

- **Bundle id / applicationId** — default `com.example.<app_name>`
- **App display name** — default Title Case of the name
- **Run `flutter pub get` now?** — default yes

It creates a ready-to-run project in `./<app_name>`.

### Non-interactive

```bash
npx github:dotuananhtb/flutter my_app \
  --bundle com.acme.myapp \
  --name "My App" \
  --yes
```

### Options

| Option | Default | Description |
|---|---|---|
| `--bundle <id>` | `com.example.<name>` | applicationId / iOS bundle id |
| `--org <reverse-domain>` | `com.example` | org prefix for the default bundle |
| `--name "<Display>"` | Title Case of name | app display name |
| `--ref <branch>` | `main` | template branch/tag |
| `--template <owner/repo>` | `dotuananhtb/flutter-clean-base` | source template |
| `--no-install` | — | skip `flutter pub get` |
| `--codegen` | — | also run `build_runner` |
| `-y, --yes` | — | accept all defaults, no prompts |
| `-h, --help` | — | show help |

### After scaffolding

```bash
cd my_app
flutter run --flavor develop -t lib/main_develop.dart
```

## Requirements

- Node.js ≥ 18 (for `npx`)
- [GitHub CLI](https://cli.github.com/) authenticated: `gh auth login`
- Flutter SDK on `PATH`

## Optional: shorter command via npm

```bash
npm login
npm publish
# then, anywhere:
npx create-flutter-clean-base my_app
```
