# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2026-02-15

### Added
- **Project Showcase**: Integrated a high-definition tool demonstration image in the README for immediate visual impact.
- **Root Cleanup**: Advanced project restructuring by moving ancillary documentation (`CHANGELOG`, `CONTRIBUTING`, etc.) into `res/docs/` to maintain a professional repository root.

### Changed
- **Documentation Engineering**: Re-authored the `README.md` with detailed feature descriptions, technical highlighting, and improved navigation links.

## [1.2.0] - 2026-02-15

### Added
- **Rank Tab (New)**: Dedicated module for Rank overrides with live "Draft Preview" and native LCU bridge integration.
- **Master Tier Aesthetic**: Radical UI overhaul with borderless design, holographic grids, and refined gold-trim glassmorphism.
- **Hextech Toast System**: Top-center animated notifications with glassmorphism and contextual icons for immediate user feedback.
- **Update Intelligence**: Contextual navigation beacons and a dedicated system management panel in Settings to replace intrusive banners.

### Changed
- **Messaging Humanization**: Simplified technical jargon (e.g., "Bridge Interface" instead of "Kernel Optimization") for better user accessibility.
- **Home Dashboard**: Purged visual clutter and hero badges for a cleaner, more professional "mission-control" feel.
- **Performance Architecture**: Deduplicated imports and optimized asset loading for improved runtime efficiency.

### Fixed
- **Layout Integrity**: Forced strict overflow controls to eliminate scrollbars and maintain the "borderless client" immersion.
- **Import Conflicts**: Resolved duplicate icon and state declarations in the main application logic.



## [1.1.16] - 2026-02-14

### Added
- **Social Integration**: Added direct links to GitHub and Ko-fi in the navigation bar for better project visibility and sponsorship access.

### Changed
- **Branding**: Rebranded as "League Profile Tool" for clearer project identification.
- **UI Architecture**: Redesigned the update notification with a sophisticated "Modern Gold-Trim" aesthetic, balancing premium look with non-intrusive layout.
- **Layout Refinement**: Streamlined the status bar to focus on technical connectivity, moving social links to the top navigation for better balance.


## [1.1.15] - 2026-02-14

### Added
- **Infrastructure Security**: Integrated GitHub CodeQL for automated security vulnerability scanning.
- **Support & Funding**: Added Ko-fi sponsorship support and GitHub Funding configuration.
- **Enhanced README**: Added dynamic badges for release tracking, build status, and security monitoring.
- **Automation**: Configured Dependabot for daily dependency and security updates.

### Fixed
- **Updater Consistency**: Improved the manual update recommendation banner flow.

## [1.1.14] - 2026-02-14

### Added
- **Premium Update Banner**: Introduced a marketing-focused update recommendation banner in the Home dashboard.
- **Project Vision**: Added a new "Project Vision" section to the dashboard highlighting the core values of the tool.

### Changed
- **User Interface**: Refined the dashboard layout with better spacing and Hextech-inspired gold accents.
- **Workflow**: Removed the manual "Update Check" button in favor of the automated dashboard notification.
- **Experience**: Switched from forceful auto-updates to a non-intrusive recommendation flow.

## [1.1.13] - 2026-02-14

### Fixed
- **Signature Stabilization**: Final adjustments to the signing process to ensure all artifacts are correctly verified.

## [1.1.12] - 2026-02-14

### Fixed
- **Release Automation**: Added a release deletion step to the CI/CD pipeline to resolve "already exists" errors during re-runs.
- **Artifact Naming**: Corrected macOS naming conventions to include architecture suffixes.

## [1.1.11] - 2026-02-14

### Fixed
- **CI/CD Reliability**: Resolved 404 errors during artifact signature downloads by aligning paths with actual build outputs.

## [1.1.7] - [1.1.10] - 2026-02-14

### Fixed
- **Permissions**: Hardened GitHub Actions permissions using Personal Access Tokens (PAT).
- **Network Stability**: Added error handling for intermittent DNS/Network issues during the release process.
- **Release Logic**: Switched to manual release creation via GitHub CLI to bypass recurring API restrictions.

## [1.1.6] - 2026-02-14

### Fixed
- **Auto-Updater**: Fixed the GitHub Actions workflow to correctly generate and sign update artifacts.
- **CI/CD**: Added missing signing keys to the release pipeline and corrected environment variable names.

## [1.1.5] - 2026-02-14

### Added
- **Community Standards**: Added `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `SECURITY.md` for professional open-source governance.
- **GitHub Templates**: Implemented advanced YAML issue templates for Bug Reports and Feature Requests to standardize user feedback.
- **PR Template**: Added a detailed Pull Request template to ensure code quality from contributors.

## [1.1.4] - 2026-02-14

### Fixed
- **Update URLs**: Corrected the naming convention for artifacts in `updater.json` to ensure the auto-updater can find the files on GitHub.

## [1.1.3] - 2026-02-14

### Fixed
- **CI/CD Build**: Reverted macOS runner and refined build sequence to ensure cross-platform compatibility.

## [1.1.2] - 2026-02-14

### Fixed
- **CI/CD Build**: Resolved macOS DMG bundling failure in GitHub Actions by explicitly defining macOS targets and optimizing the build arguments.

## [1.1.1] - 2026-02-14

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
