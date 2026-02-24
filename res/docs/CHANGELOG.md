# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.1] - 2026-02-24

### Fixed
- Replaced deprecated Lucide `Github` icon with `react-icons` (`SiGithub`) to eliminate TypeScript deprecation warnings.


## [1.5.0] - 2026-02-23

### Added
- **🏆 Profile Tokens**: Introduced a dedicated "Tokens" tab for customizing challenge medals on your profile.
- **🖼️ Visual Picker**: New HD token selection grid powered by Community Dragon assets.
- **🔄 Multi-Slot Assignment**: Added support for assigning the same token to multiple slots simultaneously.
- **🔍 Smart Search**: Real-time filtering for owned tokens within the selection modal.
- **📡 Sync Control**: Added a RotateCw icon for manual token synchronization and status badges for owned count.

### Fixed
- **🔒 LCU Bridge**: Hardened the backend whitelist to securely allow challenge-related endpoints.
- **🧩 Data Parsing**: Improved LCU response handling to support both object-mapped and array-based token lists.
- **♿ Accessibility**: Migrated UI modals to native `<dialog>` elements; resolved SonarCloud violations regarding non-interactive event listeners.
- **🧹 Code Quality**: Removed deprecated Github icons, stabilized uncaught exceptions, and eliminated nested conditional statements.

### Changed
- **💎 UI Refinement**: Streamlined the Tokens tab by removing redundant labels and optimizing grid density for a cleaner look.
- **📦 Dependencies (Dependabot)**: Bumped `actions/checkout` from 4 to 6.

## [1.4.2] - 2026-02-22

### Fixed
- **🚀 Updater**: Migrated from CDN-cached `raw.githubusercontent` to GitHub Releases API to guarantee instant update detection upon launch.
- **🔧 CI/CD**: Fixed a Syntax Error vulnerability in `auto-close-fixed-issues.yml` by using environment variables to securely pass JSON output to GitHub Scripts instead of unsafe inline interpolation.

## [1.4.1] - 2026-02-22

### Fixed
- **🔧 CI/CD**: Resolved YAML syntax error on line 150 of `auto-close-fixed-issues.yml` caused by a backtick-delimited JavaScript template literal inside a YAML block scalar — replaced with safe string concatenation.

## [1.4.0] - 2026-02-22

### Added
- **🎵 LastFM Bio Sync**: Dynamic bio integration with the Last.fm API — the app now automatically updates your League profile bio with the song you are currently listening to.

### Changed
- **⚡ App Architecture**: Refactored the root `App` component to reduce Cognitive Complexity from 22 to under 15, improving maintainability and readability.

### Fixed
- **🔒 Security (CodeQL)**: Resolved incomplete URL substring sanitization warnings flagged by CodeQL analysis.
- **♿ Accessibility**: Associated all form labels with their controls across all tabs; added accessible text to icon-only switch labels; added full keyboard accessibility to remaining interactive elements.
- **🔧 Code Quality**: Replaced all `role='button'` divs with semantic native `<button>` elements; removed unnecessary `as any` type assertions; replaced `String#replace` with `String#replaceAll` where appropriate; switched timer globals from `window` to `globalThis`.
- **📋 Logs**: Resolved React key warning caused by array index usage in the logs list.
- **⚠️ Exception Handling**: Improved error handling in the rank override flow.

### Testing
- **🧪 Unit Tests**: Added comprehensive test suite for all tabs and hooks, reaching 80%+ code coverage to satisfy SonarCloud quality gate.


## [1.3.7] - 2026-02-19

### Added
- **Security CI**: Added automated VirusTotal scanning workflow for release assets (`.github/workflows/virustotal-report.yml`).
- **Security Report**: Added versioned report output at `res/docs/SECURITY_REPORT.md`, automatically updated by CI.

### Changed
- **Documentation (README)**: Reworked structure with quicker onboarding, trust-focused sections, security links, and improved markdown presentation.
- **Dependencies (Dependabot)**: Bumped `lucide-react` from 0.574.0 to 0.575.0.

## [1.3.5] - 2026-02-17

### Changed
- **Dependencies (Dependabot)**: Bumped `github/codeql-action` from 3 to 4.
- **Dependencies (Dependabot)**: Bumped `actions/checkout` from 4 to 6.
- **Dependencies (Dependabot)**: Bumped `lucide-react` from 0.564.0 to 0.574.0.
- **Dependencies (Dependabot)**: Bumped `@types/react-window` from 1.8.8 to 2.0.0.

## [1.3.4] - 2026-02-16

### Added
- **Status Control**: Added LCU status selector inside the Bio tab.
- **Log Export**: Export system logs to a user-selected file path.

### Changed
- **LCU Requests**: Refactored LCU request handling with stricter validation.
- **Connection Logging**: Improved client connection log behavior to reduce noise.

## [1.3.3] - 2026-02-15

### Changed
- **README Redesign**: Improved badge styling with centered layout and better visual hierarchy
- **Features Documentation**: Reorganized features into clear categories (Core Functionality, Premium Interface, Advanced Features)
- **Badge Style**: Updated from flat-square to modern flat-square with custom colors and logos

### Fixed
- **CI/CD**: Resolved GitHub Actions permissions issue preventing automatic updater.json updates
- **Release Workflow**: Added proper authentication for automated commits during release process

## [1.3.2] - 2026-02-15

### Added
- **🛡️ Snyk Security Integration**: Automated vulnerability scanning for all dependencies on every push and pull request.
- **📊 SonarCloud Code Analysis**: Continuous code quality monitoring with automatic detection of bugs, code smells, and security hotspots.
- **✅ PullApprove Workflow**: Structured code review process requiring maintainer approval for all pull requests.
- **👥 All Contributors Recognition**: Automated contributor tracking and recognition system integrated into the README.
- **Security Badges**: Added Snyk and SonarCloud quality gate badges to the README for transparency.

### Changed
- **Documentation**: Enhanced README with new "Code Quality & Security" section highlighting automated quality gates.
- **CI/CD Pipeline**: Integrated security and quality checks into the automated build process.

## [1.3.1] - 2026-02-15

### Changed
- **Dependencies**: Bumped TypeScript from 5.8.3 to 5.9.3.

## [1.3.0] - 2026-02-15

### Added
- **Global Icon swapper**: Integrated the complete Data Dragon icon library (over 6,000 icons) with high-definition previews.
- **Smart Search**: Real-time filtering by icon name or ID.

### Changed
* **UI Polishing**: Reworked search bar and icon grid styles for better density and premium aesthetic.


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
