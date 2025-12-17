import * as vscode from "vscode";
import * as cp from "child_process";
import * as util from "util";

const exec = util.promisify(cp.exec);

export interface AdoContext {
	orgUrl: string;
	project: string;
	repo: string;
}

export async function getAdoContextFromWorkspace(): Promise<
	AdoContext | undefined
> {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		return undefined;
	}

	// Use the first workspace folder for now
	const cwd = workspaceFolders[0].uri.fsPath;

	try {
		const { stdout } = await exec("git config --get remote.origin.url", {
			cwd,
		});
		const remoteUrl = stdout.trim();

		if (!remoteUrl) {
			return undefined;
		}

		// Example: https://ksec-neo@dev.azure.com/ksec-neo/KCP%202.0/_git/kcp2-backend-veronica
		// Decode URI components to handle %20
		const decodedUrl = decodeURIComponent(remoteUrl);

		// Parsing logic
		// 1. Host: dev.azure.com or *.visualstudio.com

		let org: string | undefined;
		let project: string | undefined;
		let repo: string | undefined;

		// Regex for dev.azure.com
		// https://[user@]dev.azure.com/{org}/{project}/_git/{repo}
		const devAzureRegex =
			/dev\.azure\.com\/([^/]+)\/([^/]+)\/_git\/([^/]+)/;
		const devAzureMatch = decodedUrl.match(devAzureRegex);

		if (devAzureMatch) {
			org = devAzureMatch[1];
			project = devAzureMatch[2];
			repo = devAzureMatch[3];
			return {
				orgUrl: `https://dev.azure.com/${org}`,
				project: project,
				repo: repo,
			};
		}

		// Regex for visualstudio.com
		// https://{org}.visualstudio.com/{project}/_git/{repo}
		// https://{org}.visualstudio.com/_git/{repo} (Default project?)
		const vsRegex =
			/([^/]+)\.visualstudio\.com\/(?:([^/]+)\/)?_git\/([^/]+)/;
		const vsMatch = decodedUrl.match(vsRegex);

		if (vsMatch) {
			org = vsMatch[1];
			project = vsMatch[2] || org; // Often project name maps to org name if omitted, or it's cross-project? Let's check.
			// If project is missing in URL, it's usually the DefaultCollection or same as Org, but newer style makes project explicit.
			if (!project) {
				project = repo;
			} // Fallback, unlikely to be correct but safe.
			repo = vsMatch[3];

			if (!project || !repo) {
				return undefined;
			}

			return {
				orgUrl: `https://${org}.visualstudio.com`,
				project: project,
				repo: repo,
			};
		}
	} catch (e) {
		console.warn("Failed to detect git context", e);
	}

	return undefined;
}
