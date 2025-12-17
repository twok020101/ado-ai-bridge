import * as azdev from "azure-devops-node-api";
import * as GitApi from "azure-devops-node-api/GitApi";
import * as GitInterfaces from "azure-devops-node-api/interfaces/GitInterfaces";

export class AzureDevOpsService {
	private connection: azdev.WebApi | undefined;
	private gitApi: GitApi.IGitApi | undefined;

	public async getGitApi(): Promise<GitApi.IGitApi> {
		if (!this.gitApi) {
			await this.initialize();
		}
		if (!this.gitApi) {
			// Should not happen after initialize
			throw new Error("Git API failed to initialize");
		}
		return this.gitApi;
	}

	private mockMode: boolean = false;

	constructor(
		private orgUrl: string,
		private token: string,
		mockMode?: boolean
	) {
		this.mockMode = mockMode || false;
		if (!this.mockMode && (!orgUrl || !token)) {
			// Credentials might be missing initially
		}
	}

	public async initialize(): Promise<void> {
		if (this.mockMode) {
			console.log("Mock Mode enabled. Skipping ADO connection.");
			return;
		}
		if (!this.orgUrl || !this.token) {
			throw new Error(
				"Organization URL or Personal Access Token is missing."
			);
		}
		const authHandler = azdev.getPersonalAccessTokenHandler(this.token);
		this.connection = new azdev.WebApi(this.orgUrl, authHandler);
		this.gitApi = await this.connection.getGitApi();
	}

	private async ensureInitialized(): Promise<void> {
		if (!this.gitApi) {
			await this.initialize();
		}
	}

	public async getPrDiff(repoId: string, prId: number): Promise<string> {
		await this.ensureInitialized();
		if (!this.gitApi) {
			throw new Error("Git API not initialized");
		}

		try {
			// 1. Get Iterations to find the latest
			const iterations = await this.gitApi.getPullRequestIterations(
				repoId,
				prId
			);
			const lastIteration =
				iterations && iterations.length > 0
					? iterations[iterations.length - 1]
					: undefined;

			if (!lastIteration || !lastIteration.id) {
				return "No iterations found for this PR. (Might be a new or draft PR)";
			}

			// 2. Get Changes for the last iteration
			const changes = await this.gitApi.getPullRequestIterationChanges(
				repoId,
				prId,
				lastIteration.id
			);

			if (
				!changes ||
				!changes.changeEntries ||
				changes.changeEntries.length === 0
			) {
				return "No changes found in the latest iteration.";
			}

			let diffOutput = `Summary: ${changes.changeEntries.length} files changed.\n\n`;

			// Limit to first 20 files to avoid hitting limits or huge context
			const maxFiles = 20;
			const entries = changes.changeEntries.slice(0, maxFiles);

			for (const entry of entries) {
				const path = entry.item?.path || "unknown-path";
				const changeType = entry.changeType; // 1=Add, 2=Edit, 3=Encoding, 4=Rename, 8=Delete, 16=Undelete

				diffOutput += `--- File: ${path} (ChangeType: ${changeType}) ---\n`;

				// If Delete (8), skip content
				if (changeType === 8) {
					diffOutput += "(File Deleted)\n\n";
					continue;
				}

				// If Folder, skip
				if (entry.item?.isFolder) {
					diffOutput += "(Folder)\n\n";
					continue;
				}

				// Try to fetch content for 'new' objectId
				if (entry.item?.objectId) {
					try {
						const stream = await this.gitApi.getBlobContent(
							repoId,
							entry.item.objectId
						);
						const content = await this.streamToString(stream);
						// Truncate if too long?
						if (content.length > 20000) {
							diffOutput +=
								content.substring(0, 20000) +
								"\n... (Truncated)\n\n";
						} else {
							diffOutput += content + "\n\n";
						}
					} catch (err: unknown) {
						const errorMessage =
							err instanceof Error ? err.message : String(err);
						diffOutput += `(Error fetching content: ${errorMessage})\n\n`;
					}
				} else {
					diffOutput += "(No Object ID for content)\n\n";
				}
			}

			if (changes.changeEntries.length > maxFiles) {
				diffOutput += `... and ${
					changes.changeEntries.length - maxFiles
				} more files.`;
			}

			return diffOutput;
		} catch (e: unknown) {
			const errorMessage = e instanceof Error ? e.message : String(e);
			console.error("Error fetching diff:", e);
			return "Error fetching diff: " + errorMessage;
		}
	}

	private streamToString(stream: NodeJS.ReadableStream): Promise<string> {
		return new Promise((resolve, reject) => {
			const chunks: Buffer[] = [];
			stream.on("data", (chunk) => chunks.push(chunk));
			stream.on("end", () =>
				resolve(Buffer.concat(chunks).toString("utf8"))
			);
			stream.on("error", (err) => reject(err));
		});
	}

	public async getPrDetails(
		repoId: string,
		prId: number
	): Promise<GitInterfaces.GitPullRequest> {
		await this.ensureInitialized();
		if (!this.gitApi) {
			throw new Error("Git API not initialized");
		}
		return await this.gitApi.getPullRequestById(prId, repoId);
	}

	public async listRepositories(
		projectName: string
	): Promise<Array<{ id: string; name: string }>> {
		if (this.mockMode) {
			return [
				{ id: "mock-repo-1", name: "Mock Repository 1" },
				{ id: "mock-repo-2", name: "Mock Repository 2" },
			];
		}
		await this.ensureInitialized();
		if (!this.gitApi) {
			throw new Error("Git API not initialized");
		}
		const repos = await this.gitApi.getRepositories(projectName);
		return repos.map((repo) => ({
			id: repo.id || "",
			name: repo.name || "",
		}));
	}
}
