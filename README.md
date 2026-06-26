# create-flutter-clean-base

Scaffold a new **Flutter Clean Architecture + BLoC** app from the
[`flutter-clean-base`](https://github.com/dotuananhtb/flutter-clean-base)
template — like `create-react-app` / `create-next-app`, but for Flutter.

## Usage

On any machine where you are logged in to GitHub (`gh auth login`) and have
Flutter installed:

```bash
npx github:dotuananhtb/flutter my_app
```

It will interactively ask for the bundle id, app display name and whether to run
`flutter pub get`, then produce a ready-to-run project in `./my_app`.

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
| `--codegen` | — | also run `build_runner` (needs the pinned Flutter 3.35.2) |
| `-y, --yes` | — | accept all defaults, no prompts |

## What it does

1. Clones the template via `gh` (your GitHub auth) — works with the private template.
2. Renames the Dart package, applicationId / bundle id, app display name and the
   Android Kotlin package; moves `MainActivity.kt`.
3. Resets git history with a fresh initial commit.
4. Runs `flutter pub get` (unless `--no-install`).

## Requirements

- Node.js ≥ 18 (for `npx`)
- [GitHub CLI](https://cli.github.com/) authenticated (`gh auth login`) — needed to clone the private template
- Flutter SDK on `PATH`

## Optional: publish to npm for a shorter command

```bash
npm login
npm publish
# then anywhere:
npx create-flutter-clean-base my_app
# or
npm create flutter-clean-base my_app
```
