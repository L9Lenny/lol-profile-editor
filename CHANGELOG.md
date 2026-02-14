# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-02-14

### Added
- **Window Management**: Enabled support for window resizing.
- **Custom Exit Behavior**: Added a new "Minimize to Tray" toggle in Settings, allowing users to choose between closing the app or keeping it active in the system tray.
- **High-Contrast Logs**: Redesigned the logging console for better readability and professional look.

### Changed
- **Visual Overhaul (v2)**: Completely redesigned the UI with a refined "Hextech Glass" aesthetic.
- **Improved Navigation**: Tabs now feature a soft-glow background highlight instead of standard underlines.
- **Softened UI Components**: Replaced harsh gold borders with subtle glass borders and increased corner rounding for a modern feel.
- **Micro-Interactions**: Enhanced buttons and settings rows with refined hover and active states.

### Fixed
- **Plugin Panics**: Fixed a sequence of startup panics related to `notification`, `autostart`, and `log` plugin initialization in Tauri v2.
- **Rust Type Inference**: Resolved various backend compilation errors by adding explicit type annotations to closures.

## [1.0.3] - 2026-02-14

### Added
- **Integrated Auto-Updater**: Users can now update the application with a single click from the UI.
- **Update Security**: Implemented ED25519 signing for all application updates.
- **Capability Management**: Fine-tuned application permissions for better security and functionality.
- **Enhanced CI/CD**: Optimized frontend build speed with `npm ci` and native caching.

### Fixed
- **Permissions Error**: Resolved "updater.check not allowed" by defining core capabilities.
- **Config Fix**: Moved plugin configuration to the correct root level in `tauri.conf.json`.

## [1.0.2] - 2026-02-14

### Added
- **Dynamic Version Display**: The application now automatically displays the version defined in configuration files.
- **Selective Release Notes**: Automated CI/CD script now extracts only the latest version's changes for GitHub releases.
- **Robust Extraction Logic**: Switched to `awk` for changelog extraction to ensure cross-platform compatibility in GitHub Actions.

### Changed
- **UI Refinement**: Updated "What's New" section with relevant project milestones.
- **Improved UX**: Replaced the placeholder status message with a more professional example.

## [1.0.1] - 2026-02-14

### Added
- **Rust Compilation Cache**: Implemented `rust-cache` in CI/CD to significantly reduce build times.
- **Auto-Publishing**: Releases are now automatically published to GitHub Actions instead of being saved as drafts.
- **Automated Release Notes**: The content of the release on GitHub is now automatically synced with the `CHANGELOG.md` file.

### Fixed
- **Tag Trigger**: Fixed CI/CD trigger to support both `vX.X.X` and numerical `X.X.X` tags.
- **UI Syntax**: Corrected CSS property naming in React components (camelCase fix).

### Changed
- Improved overall performance of the CI/CD pipeline.

## [1.0.0] - 2026-02-14

### Added
- **Initial Release**: Core functionality for League of Legends profile management.
- **LCU Integration**: Automated discovery of the League Client via lockfile extraction.
- **Profile Customization**: Ability to update the profile bio/status message directly from the app.
- **Premium UI**: Custom-built Hextech interface inspired by the official League of Legends client.
- **Multi-Tab Dashboard**: Features a Home dashboard and a Custom Status editor.
- **Connection Monitoring**: Real-time status bar showing LCU connection state.
- **GitHub Integration**: Quick access to the source code and documentation.
- **Multi-Platform Support**: Built for Windows and macOS.

### Fixed
- JSX syntax error in the status bar component.
- Improved error handling for LCU status codes.

### Changed
- Translated entire user interface and documentation to English.
