import * as vscode from "vscode";
import { AzureDevOpsService } from "./adoService";

export class SessionManager {
	private static instance: SessionManager;
	private service: AzureDevOpsService | undefined;

	private constructor(private secrets: vscode.SecretStorage) {}

	static init(secrets: vscode.SecretStorage) {
		if (!SessionManager.instance) {
			SessionManager.instance = new SessionManager(secrets);
		}
	}

	static getInstance(): SessionManager {
		if (!SessionManager.instance) {
			throw new Error("SessionManager not initialized");
		}
		return SessionManager.instance;
	}

	async getService(): Promise<AzureDevOpsService | undefined> {
		if (this.service) {
			return this.service;
		}

		const config = vscode.workspace.getConfiguration("adoAgentBridge");
		const orgUrl = config.get<string>("orgUrl");
		const mockMode = config.get<boolean>("enableMockMode");
		const token = await this.secrets.get("ado_pat");

		if (mockMode || (orgUrl && token)) {
			this.service = new AzureDevOpsService(
				orgUrl || "https://mock.dev",
				token || "mock-token",
				mockMode
			);
			try {
				if (!mockMode) {
					// only verify if not mock
					await this.service.getGitApi();
				}
				return this.service;
			} catch (e) {
				console.error("Failed to initialize ADO service", e);
				return undefined;
			}
		}
		return undefined;
	}

	async configure() {
		// 1. Get Org URL
		const defaultOrg = vscode.workspace
			.getConfiguration("adoAgentBridge")
			.get<string>("orgUrl");
		const orgUrl = await vscode.window.showInputBox({
			prompt: "Enter Azure DevOps Organization URL",
			value: defaultOrg || "https://dev.azure.com/",
			placeHolder: "https://dev.azure.com/myorg",
			ignoreFocusOut: true,
		});
		if (!orgUrl) {
			return;
		}

		// 2. Get PAT
		const token = await vscode.window.showInputBox({
			prompt: "Enter Personal Access Token (PAT)",
			placeHolder: "Token with Code Read/Write access",
			password: true,
			ignoreFocusOut: true,
		});
		if (!token) {
			return;
		}

		// Save
		await vscode.workspace
			.getConfiguration("adoAgentBridge")
			.update("orgUrl", orgUrl, vscode.ConfigurationTarget.Global);
		await this.secrets.store("ado_pat", token);

		// Reset service
		this.service = new AzureDevOpsService(orgUrl, token);

		// 3. Auto-fetch Project/Repos (Requested feature)
		try {
			await this.service.listRepositories(""); // Fetch all or error if we need project
			// Actually getRepositories usually can work without project if supported, or we assume project is needed.
			// Let's ask for Project if we can't list.
			// But actually, `getRepositories` accepts a project name. If empty, it might fail or return all if permitted.
			// Let's prompt for Project Name to be safe and narrow scope.

			const defaultProject = vscode.workspace
				.getConfiguration("adoAgentBridge")
				.get<string>("project");
			const project = await vscode.window.showInputBox({
				prompt: "Enter Project Name (Optional if listing all)",
				value: defaultProject,
				ignoreFocusOut: true,
			});

			if (project) {
				await vscode.workspace
					.getConfiguration("adoAgentBridge")
					.update(
						"project",
						project,
						vscode.ConfigurationTarget.Global
					);
			}

			vscode.window.showInformationMessage(
				"Configuration saved! You can now use the PR Explorer."
			);

			// Trigger refresh of tree view if possible
			vscode.commands.executeCommand("adoPrExplorer.refresh");
		} catch {
			vscode.window.showErrorMessage(
				"Configuration saved, but failed to connect/list repos. Check your PAT/URL."
			);
		}
	}
}
