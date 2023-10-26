import * as vscode from 'vscode';
import { Wiki } from './wikismtp/index';
import { showInfo, showWarning, showError } from './wikismtp/util';

export function activate(context: vscode.ExtensionContext) {
	const configCommand = vscode.commands.registerCommand(
		'wikismtp.config',
		(uri: vscode.Uri) => {
			Wiki.configWiki();
		}
	);
	context.subscriptions.push(configCommand);

	const downloadCommand = vscode.commands.registerCommand(
		'wikismtp.download',
		(uri: vscode.Uri) => {
			if (uri && uri.fsPath) {
				Wiki.download(uri.fsPath);
			}
		}
	);
	context.subscriptions.push(downloadCommand);

	const uploadCommand = vscode.commands.registerCommand(
		'wikismtp.upload',
		(uri: vscode.Uri) => {
			if (uri && uri.fsPath) {
				Wiki.upload(uri.fsPath);
			}
		}
	);
	context.subscriptions.push(uploadCommand);

	vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
		console.log('onsave');
		console.log(document);
	});
}
