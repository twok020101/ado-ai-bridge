# Product Requirements Document: ADO-Agent-Bridge

| **Project Name**    | ADO-Agent-Bridge (Azure DevOps Agent Bridge) |
| :------------------ | :------------------------------------------- |
| **Target Platform** | VS Code / Google Antigravity IDE             |
| **Version**         | 1.0 (MVP)                                    |
| **Status**          | Draft                                        |
| **Date**            | December 17, 2025                            |

---

## 1. Executive Summary

**Problem:** Developers currently face a "Context Gap" when using AI to review code. The code lives in the IDE, but the Pull Request (PR) context (Description, Discussions, CI status) lives in the Azure DevOps web UI. To get an AI Agent to review a PR, the developer must manually copy-paste diffs and descriptions, which is tedious and prone to error.

**Solution:** A VS Code extension that connects directly to Azure DevOps. It acts as a bridge, fetching the "State" of a PR (Description + Diffs) and formatting it into a structured payload that an Antigravity Agent (Gemini/Copilot) can consume to perform high-quality, intent-aware code reviews.

---

## 2. User Personas

- **The Reviewer:** A Senior Developer who wants to offload the initial "sanity check" (linting, pattern matching, security scanning) to an AI Agent before doing a deep logic dive.
- **The Author:** A Developer who wants to "Self-Review" their code using AI to catch bugs before assigning it to a human teammate.

---

## 3. User Stories

| ID       | As a...   | I want to...                                                        | So that...                                                                  |
| :------- | :-------- | :------------------------------------------------------------------ | :-------------------------------------------------------------------------- |
| **US-1** | User      | Authenticate with my ADO Personal Access Token (PAT)                | The extension can access my organization's private repos.                   |
| **US-2** | User      | See a list of active PRs assigned to me in a Sidebar View           | I don't have to leave the IDE to find work.                                 |
| **US-3** | User      | Click a "Load Context" button for a specific PR                     | The Extension fetches the Title, Description, and File Diffs automatically. |
| **US-4** | **Agent** | Receive a structured JSON payload containing the PR intent and code | I can analyze _why_ changes were made, not just _what_ changed.             |
| **US-5** | **Agent** | Submit comments back to the PR via a Tool Call                      | I can post review findings to Azure DevOps without the user copy-pasting.   |

---

## 4. Functional Requirements

### 4.1 Authentication & Configuration

- **FR-1:** Extension must allow input of `Organization URL` and `Personal Access Token (PAT)`.
- **FR-2:** Credentials must be stored securely using VS Code's `SecretStorage` API.

### 4.2 The "PR Explorer" (UI)

- **FR-3:** A Tree View in the Sidebar displaying:
    - Active PRs (Assigned to User)
    - Created by User
- **FR-4:** Clicking a PR item opens a summary page or triggers the Context Fetch command.

### 4.3 Context Fetching (The Core Engine)

- **FR-5:** `fetchPrContext(prId)`:
    - Must retrieve **PR Description** (Crucial for intent analysis).
    - Must retrieve **Acceptance Criteria** (if linked to Work Items - _Nice to have for MVP_).
    - Must retrieve **File Diffs** (The raw code changes).
- **FR-6:** **Prompt Injection:** The extension must automatically inject this context into the active Agent's context window (or copy to clipboard if direct injection isn't supported).

### 4.4 Agent Tools (API for the AI)

The extension must expose commands that the Agent can "Call" (if using an Agentic workflow):

- `adoBridge.getPrDetails`: Returns JSON of the PR.
- `adoBridge.postComment`: Accepts `{ filePath, lineNumber, comment }` and posts to ADO.

---

## 5. Technical Architecture

### 5.1 Tech Stack

- **Language:** TypeScript
- **Framework:** VS Code Extension API
- **SDK:** `azure-devops-node-api` (Official Microsoft SDK)

### 5.2 Data Payload Structure (The Interface)

This is the JSON structure the extension will generate for the Agent to read.

```json
{
	"meta": {
		"pr_id": 452,
		"title": "Feat: Add Redis Caching to Auth Service",
		"author": "jane.doe@org.com",
		"status": "active"
	},
	"intent": {
		"description": "Implements Redis caching for the /login endpoint to reduce DB load. Also fixes a typo in the User model.",
		"work_items": ["User Story #99: Reduce Login Latency"]
	},
	"changes": [
		{
			"file_path": "src/services/auth.ts",
			"change_type": "edit",
			"diff_chunk": "@@ -45,6 +45,9 @@\n- const user = await db.findUser(id);\n+ const user = await cache.get(id) || await db.findUser(id);"
		},
		{
			"file_path": "src/models/User.ts",
			"change_type": "edit",
			"diff_chunk": "..."
		}
	]
}
```

6. UX Flow (The "Happy Path")
   Setup: User installs extension, runs ADO Bridge: Login, enters PAT.

Selection: User opens "ADO Bridge" sidebar, sees "PR #101: Fix API Login".

Activation: User right-clicks PR #101 -> Selects "Review with Agent".

Processing:

Extension calls ADO API.

Extension formats the JSON payload.

Extension opens the Agent Chat and pastes: "System: Here is the context for PR #101. Please review based on the description provided."

Review: Agent analyzes JSON.

Action: Agent outputs suggestions. User clicks "Approve" on specific suggestions to post them to ADO.

7. Security & Compliance
   Data Privacy: PR code is processed locally (or via the user's existing LLM subscription). The extension must not send code to any other telemetry service.

Write Access: The extension should default to "Dry Run" mode (showing comments to the user first) before posting to ADO, to prevent the Agent from spamming the PR.

8. Implementation Roadmap
   Phase 1: The Viewer (Week 1)
   Authentication (PAT).

List PRs in Sidebar.

View PR Description in a readonly editor tab.

Phase 2: The Context Bridge (Week 2)
Implement getPrDiffs.

Create the "Copy Context to Clipboard" command (Manual Agent Handoff).

Milestone: User can manually paste context to Gemini/Copilot and get a review.

Phase 3: The Agent Tools (Week 3)
Implement postComment API.

Automate the handoff (Direct injection into Agent chat if API permits).

9. Appendix: System Prompt for Agent
   This prompt should be built into the extension's "Copy Prompt" feature.

Role: You are a Senior Code Reviewer. Task: Review the following PR Context. Process:

Read the Description to understand the Intent.

Check the Diffs to verify the Implementation.

Flag Discrepancies: If the code changes logic not mentioned in the description, mark it as "Scope Creep".

Flag Missing Items: If the description promises a feature (e.g., "Added Tests") but the diff shows no test files, mark it as "Missing Implementation".

Security Check: Scan changed lines for vulnerabilities.

Output: detailed JSON format compatible with ADO-Agent-Bridge.
