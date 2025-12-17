import * as vscode from "vscode";
import { AzureDevOpsService } from "./adoService";
import { SessionManager } from "./session";

export interface PrContextArgs {
	repoId?: string;
	prId?: number;
	title?: string;
	description?: string;
	sourceRefName?: string;
	targetRefName?: string;
}

export async function dumpContextToClipboard(args?: PrContextArgs) {
	console.log("dumpContextToClipboard called with args:", args);
	const session = SessionManager.getInstance();
	let service = await session.getService();

	if (!service) {
		// Trigger configuration if no service available
		const result = await vscode.window.showInformationMessage(
			"ADO Bridge is not configured. Configure now?",
			"Yes",
			"No"
		);
		if (result === "Yes") {
			await session.configure();
			service = await session.getService();
		}
	}

	if (!service) {
		return;
	} // User cancelled or failed

	const project = vscode.workspace
		.getConfiguration("adoAgentBridge")
		.get<string>("project");

	let repoId: string | undefined = args?.repoId;
	let prId: number | undefined = args?.prId;
	let prTitle: string | undefined = args?.title;
	let prDesc: string | undefined = args?.description;
	let sourceRef: string | undefined = args?.sourceRefName;
	let targetRef: string | undefined = args?.targetRefName;

	// IF arguments are NOT provided, show picker
	if (!repoId || !prId) {
		try {
			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: "Fetching active PRs...",
				},
				async () => {
					if (project && service) {
						const gitApi = await service.getGitApi();
						const prs = await gitApi.getPullRequestsByProject(
							project,
							{
								status: 1,
							}
						); // 1 = Active

						if (prs.length > 0) {
							const picked = await vscode.window.showQuickPick(
								prs.map((pr) => ({
									label: pr.title || "Untitled",
									description: `PR #${pr.pullRequestId} by ${pr.createdBy?.displayName}`,
									detail: pr.repository?.name,
									pr: pr,
								})),
								{ placeHolder: "Select a PR to dump context" }
							);

							if (picked) {
								repoId = picked.pr.repository?.id;
								prId = picked.pr.pullRequestId;
								prTitle = picked.pr.title;
								prDesc = picked.pr.description;
								sourceRef = picked.pr.sourceRefName;
								targetRef = picked.pr.targetRefName;
							}
						} else {
							vscode.window.showInformationMessage(
								"No active PRs found in project. Enter ID manually?"
							);
						}
					}
				}
			);
		} catch (e) {
			console.error(e);
		}
	}

	// Fallback to manual entry if no selection
	if (!repoId || !prId) {
		const repoInput = await vscode.window.showInputBox({
			prompt: "Enter Repository ID (UUID)",
			ignoreFocusOut: true,
		});
		if (!repoInput) {
			return;
		}
		repoId = repoInput;

		const prInput = await vscode.window.showInputBox({
			prompt: "Enter PR ID (Numeric)",
			ignoreFocusOut: true,
		});
		if (!prInput) {
			return;
		}
		prId = parseInt(prInput);
	}

	if (!repoId || !prId || !service) {
		return;
	}

	try {
		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: "Fetching PR Context...",
			},
			async () => {
				// If we didn't get details from picker/args, fetch them
				if (!prTitle || !prDesc || !sourceRef || !targetRef) {
					const details = await service!.getPrDetails(repoId!, prId!);
					if (details) {
						console.log(
							"Full PR Details JSON:",
							JSON.stringify(details, null, 2)
						);
						prTitle = details.title;
						prDesc = details.description;
						sourceRef = details.sourceRefName;
						targetRef = details.targetRefName;
					}
				}

				if (!prTitle) {
					prTitle = "Untitled PR";
				}
				if (!prDesc) {
					prDesc = "No description provided.";
				}
				if (!sourceRef) {
					sourceRef = "unknown";
				}
				if (!targetRef) {
					targetRef = "unknown";
				}

				// const diff = await service!.getPrDiff(repoId!, prId!); // Diff no longer needed in prompt

				const context = `### Role
You are a Senior Software Architect and Security Specialist acting as an automated code reviewer.

### Input Data
You are provided with the following Pull Request metadata:
- **Title:** ${prTitle}
- **Description:** ${prDesc}
- **Source Branch:** \`${sourceRef}\`
- **Target Branch:** \`${targetRef}\`

### Interactive Review Instructions
As an Agent with CLI access to the repository:
1. **Checkout** the source branch: \`git checkout ${sourceRef.replace(
					"refs/heads/",
					""
				)}\`
2. **Diff** against the target: \`git diff ${targetRef.replace(
					"refs/heads/",
					""
				)}\`
3. **Analyze** the changes based on the criteria below.

### Analysis Criteria
Analyze the code for:
1. **Correctness:** Does the implementation match the description?
2. **Security:** SQL injection, XSS, exposed secrets, input validation.
3. **Performance:** N+1 queries, expensive loops, memory leaks.
4. **Style:** TypeScript best practices, proper typing (no \`any\`).

### Output Format (Strict)
If you find issues, output a JSON array exactly like this:

\`\`\`json
[
  {
    "file": "src/services/auth.ts",
    "line": 45,
    "severity": "high",
    "comment": "Security Risk: This input is not sanitized before being passed to the raw query."
  },
  {
    "file": "src/components/Button.tsx",
    "line": 12,
    "severity": "suggestion",
    "comment": "Nit: Use the 'primary' variant constant instead of a hardcoded string."
  }
]
\`\`\`
             `;

				await vscode.env.clipboard.writeText(context);
				vscode.window.showInformationMessage(
					"PR Context copied to clipboard!"
				);
			}
		);
	} catch (error) {
		vscode.window.showErrorMessage(
			`Failed: ${error instanceof Error ? error.message : "Unknown error"}`
		);
	}
}

export async function listRepositories(adoService: AzureDevOpsService) {
	const projectName = await vscode.window.showInputBox({
		prompt: "Enter Project Name",
		placeHolder: "e.g., MyProject",
		ignoreFocusOut: true,
	});
	if (!projectName) {
		return;
	}

	try {
		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: "Fetching repositories...",
			},
			async () => {
				const repos = await adoService.listRepositories(projectName);

				if (repos.length === 0) {
					vscode.window.showInformationMessage(
						"No repositories found."
					);
					return;
				}

				// Show repositories in a quick pick
				const selected = await vscode.window.showQuickPick(
					repos.map((r) => ({
						label: r.name,
						description: r.id,
						detail: `Repository ID: ${r.id}`,
					})),
					{
						placeHolder: "Select a repository to copy its ID",
						ignoreFocusOut: true,
					}
				);

				if (selected) {
					await vscode.env.clipboard.writeText(
						selected.description || ""
					);
					vscode.window.showInformationMessage(
						`Repository ID copied: ${selected.description}`
					);
				}
			}
		);
	} catch (error) {
		if (error instanceof Error) {
			vscode.window.showErrorMessage(
				`Failed to fetch repositories: ${error.message}`
			);
		} else {
			vscode.window.showErrorMessage(
				`Failed to fetch repositories: Unknown error`
			);
		}
	}
}
