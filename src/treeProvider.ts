import * as vscode from "vscode";
import { SessionManager } from "./session";
import { GitPullRequestSearchCriteria } from "azure-devops-node-api/interfaces/GitInterfaces";
import { getAdoContextFromWorkspace } from "./gitContext";

export class AdoPrTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<
		vscode.TreeItem | undefined | null | void
	> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<
		vscode.TreeItem | undefined | null | void
	> = this._onDidChangeTreeData.event;

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
		if (element) {
			return [];
		}

		const session = SessionManager.getInstance();
		const service = await session.getService();

		// Try auto-detection first
		const gitContext = await getAdoContextFromWorkspace();

		// Configuration fallback
		let project = vscode.workspace
			.getConfiguration("adoAgentBridge")
			.get<string>("project");

		// If we found a detailed git context, prefer that project
		if (gitContext && gitContext.project) {
			project = gitContext.project;
		}

		if (!service) {
			const item = new vscode.TreeItem("Configure ADO Bridge to see PRs");
			item.command = {
				command: "adoBridge.configure",
				title: "Configure",
			};
			return [item];
		}

		if (!project) {
			const item = new vscode.TreeItem("Configure Project to see PRs");
			item.command = {
				command: "adoBridge.configure",
				title: "Configure",
			};
			return [item];
		}

		try {
			const gitApi = await service.getGitApi();

			// Search criteria
			// Search criteria
			const searchCriteria: GitPullRequestSearchCriteria = { status: 1 }; // Active
			// If we know the exact repo name from context, we want to filter by it.
			// However, getPullRequestsByProject takes a repositoryId usually to filter,
			// OR we can get all project PRs and filter locally by repository.name

			// Getting all PRs in project
			console.log(`Fetching PRs for project: ${project}`);
			const prs = await gitApi.getPullRequestsByProject(
				project,
				searchCriteria
			);
			console.log(`Fetched PRs:`, prs);

			if (!prs || prs.length === 0) {
				return [
					new vscode.TreeItem(
						`No active PRs found in project '${project}'`
					),
				];
			}

			let filteredPrs = prs;
			// Filter by current repo if detected
			if (gitContext && gitContext.repo) {
				// Fuzzy match or exact match repo name
				filteredPrs = prs.filter(
					(pr) =>
						pr.repository?.name?.toLowerCase() ===
						gitContext.repo.toLowerCase()
				);
			}

			if (filteredPrs.length === 0) {
				if (gitContext) {
					return [
						new vscode.TreeItem(
							`No active PRs for repo '${gitContext.repo}'`
						),
					];
				}
				return [new vscode.TreeItem("No active PRs found")];
			}

			return filteredPrs.map((pr) => {
				const item = new vscode.TreeItem(
					pr.title || "Untitled PR",
					vscode.TreeItemCollapsibleState.None
				);
				item.description = `PR #${pr.pullRequestId} by ${pr.createdBy?.displayName}`;
				item.iconPath = new vscode.ThemeIcon("git-pull-request");
				item.tooltip = pr.description;
				item.command = {
					command: "adoBridge.dumpContextToClipboard",
					title: "Dump Context",
					arguments: [
						{
							repoId: pr.repository?.id,
							prId: pr.pullRequestId,
							title: pr.title,
							description: pr.description,
							sourceRefName: pr.sourceRefName,
							targetRefName: pr.targetRefName,
						},
					],
				};
				return item;
			});
		} catch (e) {
			vscode.window.showErrorMessage(
				"Error fetching PRs: " +
					(e instanceof Error ? e.message : String(e))
			);
			return [new vscode.TreeItem("Error fetching PRs")];
		}
	}
}
