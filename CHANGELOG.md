# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
