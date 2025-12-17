export const workspace = {
	workspaceFolders: [],
	getConfiguration: jest.fn(),
};
export const window = {
	showInformationMessage: jest.fn(),
	showErrorMessage: jest.fn(),
	showQuickPick: jest.fn(),
	showInputBox: jest.fn(),
	withProgress: jest.fn(),
};
export const commands = {
	registerCommand: jest.fn(),
};
export const Uri = {
	file: (path: string) => ({ fsPath: path }),
};
