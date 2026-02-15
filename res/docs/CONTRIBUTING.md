# Contributing to League Profile Tool

First off, thank you for considering contributing to League Profile Tool! It's people like you that make this a great tool for the League community.

## How Can I Help?

### Reporting Bugs
- Use the [Bug Report Template](https://github.com/L9Lenny/lol-profile-editor/issues/new?template=bug_report.md).
- Include as much detail as possible (logs from the "Logs" tab are very helpful!).

### Suggesting Enhancements
- Check the issues list to see if the idea has already been suggested.
- Use the [Feature Request Template](https://github.com/L9Lenny/lol-profile-editor/issues/new?template=feature_request.md).

### Pull Requests
1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. Ensure the UI still follows the Hextech design patterns.
4. Make sure your code lints.
5. Issue that pull request!

## Development Setup

1. **Prerequisites**: Node.js v20+, Rust (latest stable).
2. **Setup**:
   ```bash
   npm install
   ```
3. **Run Dev Mode**:
   ```bash
   npm run tauri dev
   ```
4. **Build**:
   ```bash
   npm run tauri build
   ```

## Style Guide

- **Backend**: Rust (standard `cargo fmt`).
- **Frontend**: React + Vanilla CSS.
- **Commit Messages**: Use [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat: add new button`, `fix: resolve crash`).
