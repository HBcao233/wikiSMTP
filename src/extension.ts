import * as vscode from 'vscode';
import { Wiki } from './wikismtp/index';
import { showInfo, showWarning, showError, dict, raise } from './wikismtp/util';
import * as path from 'path';

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

	const downloadToDirCommand = vscode.commands.registerCommand(
		'wikismtp.downoladToDir',
		(uri: vscode.Uri) => {
			if (uri && uri.fsPath) {
				Wiki.downloadToDir(uri.fsPath);
			}
		}
	);
	context.subscriptions.push(downloadToDirCommand);

	const openUrlCommand = vscode.commands.registerCommand(
		'wikismtp.openUrl',
		(uri: vscode.Uri) => {
			if (uri && uri.fsPath) {
				Wiki.openUrl(uri.fsPath);
			}
		}
	);
	context.subscriptions.push(openUrlCommand);

	vscode.workspace.onDidSaveTextDocument((doc: vscode.TextDocument) => {
		if (path.basename(doc.fileName) !== 'wikismtp.json') {
			return;
		}

		let res: dict = {};
		try {
			res = JSON.parse(doc.getText());
		} catch (e) {
			raise('wikiSMTP配置错误: 请输入正确的JSON');
		}
		Wiki.checkConfig();
	});
}
