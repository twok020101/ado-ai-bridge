import * as vscode from "vscode";
import {
	dumpContextToClipboard,
	listRepositories,
	PrContextArgs,
} from "./commands";
import { AdoPrTreeDataProvider } from "./treeProvider";
import { SessionManager } from "./session";

export function activate(context: vscode.ExtensionContext) {
	try {
		// Initialize Session Manager
		SessionManager.init(context.secrets);
		const session = SessionManager.getInstance();

		// Tree Data Provider
		const treeProvider = new AdoPrTreeDataProvider();
		vscode.window.registerTreeDataProvider("adoPrExplorer", treeProvider);

		// Register Commands
		const disposableDump = vscode.commands.registerCommand(
			"adoBridge.dumpContextToClipboard",
			async (args: PrContextArgs | undefined) => {
				await dumpContextToClipboard(args);
			}
		);

		const disposableConfigure = vscode.commands.registerCommand(
			"adoBridge.configure",
			async () => {
				await session.configure();
				treeProvider.refresh();
			}
		);

		// Wire up list repositories to use session implicitly or explicitly
		const disposableListRepos = vscode.commands.registerCommand(
			"adoBridge.listRepositories",
			async () => {
				const service = await session.getService();
				if (service) {
					await listRepositories(service);
				} else {
					const result = await vscode.window.showInformationMessage(
						"ADO Bridge is not configured. Configure now?",
						"Yes",
						"No"
					);
					if (result === "Yes") {
						await session.configure();
						const newService = await session.getService();
						if (newService) {
							await listRepositories(newService);
						}
					}
				}
			}
		);

		// Register Refresh Command
		vscode.commands.registerCommand("adoPrExplorer.refresh", () =>
			treeProvider.refresh()
		);

		context.subscriptions.push(disposableDump);
		context.subscriptions.push(disposableConfigure);
		context.subscriptions.push(disposableListRepos);
	} catch (e) {
		console.error("Extension activation failed:", e);
		vscode.window.showErrorMessage(
			"ADO Agent Bridge failed to activate: " +
				(e instanceof Error ? e.message : String(e))
		);
	}
}

export function deactivate() {}
