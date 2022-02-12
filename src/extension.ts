// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let disposable;
	const openedFileProvider = new OpeningFilesProvider();
	vscode.window.registerTreeDataProvider('manage-opened-files.view', openedFileProvider);

	disposable = vscode.commands.registerCommand('manage-opened-files.refreshFiles', () => {
		openedFileProvider.refresh()
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('manage-opened-files.open', (doc: any) => {
		vscode.window.showTextDocument(doc);
	});
	context.subscriptions.push(disposable);

	vscode.window.onDidChangeVisibleTextEditors((e) => {
		if(vscode.window.activeTextEditor)
			openedFileProvider.Priority(vscode.window.activeTextEditor.document.fileName);
		openedFileProvider.refresh();
	});
}

// this method is called when your extension is deactivated
export function deactivate() { }

export class OpeningFilesProvider implements vscode.TreeDataProvider<OpFile> {
	constructor() { }
	fileHistory: any = {}

	getTreeItem(element: OpFile): vscode.TreeItem {
		return element;
	}

	isFilterOut(file: vscode.TextDocument): boolean {
		let startsWith: string[] = ['c_cpp_properties', 'extension-output'];
		let endsWith: string[] = ['.git', '.zip'];
		if (file.isClosed) return true;

		for (let str of startsWith) {
			let arr = file.fileName.split('/');
			if (arr[arr.length - 1].startsWith(str))
				return true;
		}
		for (let str of endsWith)
			if (file.fileName.endsWith(str))
				return true;
		return false;
	}

	Priority(fileName: string) {
		this.fileHistory[fileName] = new Date().getTime();
	}

	SortFunc(a: any, b: any) {
		let fileA: vscode.TextDocument = a.obj;
		let fileB: vscode.TextDocument = b.obj;
		if (fileA.uri.scheme == 'file' && fileB.uri.scheme == 'file') {
			//const statsA = fs.statSync(fileA.uri.fsPath);
			//const statsB = fs.statSync(fileB.uri.fsPath);
			//return statsA.mtimeMs >= statsB.mtimeMs ? -1 : 1;
			let miliA = this.fileHistory[fileA.fileName] || 0;
			let miliB = this.fileHistory[fileB.fileName] || 0;

			return miliA >= miliB ? -1 : 1;
		}

		return (a.name < b.name ? -1 : 1);
	}

	getChildren(element?: OpFile): Thenable<OpFile[]> {
		if (element) {
			return Promise.resolve([]);
		}
		else {
			let result: OpFile[] = [];
			let files: any = [];
			for (let i = 0; i < vscode.workspace.textDocuments.length; i++) {
				let f = vscode.workspace.textDocuments[i];
				if (this.isFilterOut(f))
					continue;
				let arr = f.fileName.split('/');
				files.push({ name: arr[arr.length - 1], obj: f });
			}
			files.sort(this.SortFunc.bind(this));
			for (let i = 0; i < files.length; i++) {
				result.push(new OpFile(files[i].name, files[i].obj));
			}
			return Promise.resolve(result);
		}
	}

	private _onDidChangeTreeData: vscode.EventEmitter<OpFile | undefined | null | void> = new vscode.EventEmitter<OpFile | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<OpFile | undefined | null | void> = this._onDidChangeTreeData.event;

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}
}

class OpFile extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly filename: vscode.TextDocument

	) {
		super(label);
		this.command = {
			title: 'Open', command: 'manage-opened-files.open',
			arguments: [filename]
		};
	}
}