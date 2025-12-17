# ADO AI Bridge

**ADO AI Bridge** is a VS Code extension designed to bridge the gap between Azure DevOps and AI Agents. It fetches Pull Request (PR) context—including descriptions, discussions, and file diffs—and formats it for consumption by AI models, enabling intent-aware code reviews.

## Features

- **Authentication**: Securely connect to your Azure DevOps organization using a Personal Access Token (PAT).
- **PR Explorer**: View a list of active PRs assigned to you directly in the VS Code sidebar.
- **Context Fetching**: Retrieve comprehensive PR details (Title, Description, Diffs) with a single click.
- **Clipboard Dump**: Formats the PR context into a structured prompt and copies it to your clipboard for easy pasting into ChatGPT, Gemini, or Copilot.
- **Agent Integration**: (Coming Soon) Direct API for AI agents to fetch context and post comments.

## Setup & Installation

1.  **Install the Extension**: (Marketplace link pending).
2.  **Configure Credentials**:
    - Open the Command Palette (`Cmd+Shift+P`).
    - Run `ADO Bridge: Configure`.
    - Enter your **Organization URL** (e.g., `https://dev.azure.com/myorg`).
    - Enter your **Personal Access Token (PAT)**. _Note: Ensure your PAT has `Code (Read)` and `Pull Request Threads (Read/Write)` scopes._
3.  **Project Selection**:
    - Run `ADO Bridge: Configure` again to select or update your active project.

## Usage

1.  Open the **ADO Bridge** view in the sidebar.
2.  Click the `Refresh` icon to load your active PRs.
3.  Right-click a PR and select **"Copy Context to Clipboard"**.
4.  Paste the result into your AI Assistant to get a review!

## Development

### Prerequisites

- Node.js & npm
- VS Code

### Build & Run

1.  Clone the repository.
2.  Run `npm install` to install dependencies.
3.  Press `F5` to open a new VS Code window with the extension loaded.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details (Coming Soon).

## License

[MIT](LICENSE.md)
