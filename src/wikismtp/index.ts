import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { BufferBigEndian } from './str';
import { MediaWiki } from './mediawiki';
import { isEmpty, showError, raise, showInfo, showWarning } from './util';

export interface WikiSMTPConfig {
  host: string,
  bot?: {
    username?: string,
    password?: string
  },
  ua?: string
}

export class Wiki {
  static workspaceDir: vscode.Uri;
  static configDir: vscode.Uri;
  static configFile: vscode.Uri;
  static config: WikiSMTPConfig;

  public static decode(s: string) {
    return s.replace('_0_', '\\')
      .replace('_1_', '/')
      .replace('_2_', ':')
      .replace('_3_', '*')
      .replace('_4_', '"')
      .replace('_', ':');
  }

  public static encode(s: string) {
    return s.replace('\\', '_0_')
      .replace('/', '_1_')
      .replace(':', '_2_')
      .replace('*', '_3_')
      .replace('"', '_4_');
  }

  public static configWiki() {
    if (!Wiki.checkWorkspace()) {
      return false;
    }
    if (!fs.existsSync(Wiki.configDir.fsPath)) {
      vscode.workspace.fs.createDirectory(Wiki.configDir);
    }
    if (!fs.existsSync(Wiki.configFile.fsPath)) {
      let buf = new BufferBigEndian();
      let content = '{\n  "host": "hgadventure.huijiwiki.com",\n  "bot": {\n    "username": "",\n    "password": ""\n  },\n  "ua": ""\n}';
      buf.pushStringWithUtf8(content);
      vscode.workspace.fs.writeFile(Wiki.configFile, buf.toUint8Array())
        .then(() => {
          Wiki.openLocalFile(Wiki.configFile);
        });
      return;
    }
    Wiki.openLocalFile(Wiki.configFile);
  }

  public static download(filePath: string) {
    let pathname = path.parse(Wiki.decode(filePath)).name;
    if (!Wiki.checkConfig()) {
      return;
    }

    setTimeout(async () => {
      let mw = new MediaWiki(this.config);
      await mw.site_init();
      let page = mw.getPage(pathname);
      await page.initialize();
      let page_text = await page.text();
      // console.log(page_text);

      let doc = vscode.workspace.textDocuments[0];
      if (doc.uri.fsPath !== filePath) {
        let a = await vscode.workspace.openTextDocument(filePath)
          .then(d => {
            vscode.window.showTextDocument(d);
            return d;
          }, err => {
            raise(`打开 ${filePath} 失败, ${err}.`);
          });
        if (a) { doc = a; }
      }

      // let editor = vscode.window.activeTextEditor;
      let last_line = doc.lineAt(doc.lineCount - 1);
      let r = new vscode.Range(0, 0, doc.lineCount - 1, last_line.text.length);
      let workspaceEdit = new vscode.WorkspaceEdit();
      workspaceEdit.set(doc.uri, [
        vscode.TextEdit.delete(r),
        vscode.TextEdit.insert(new vscode.Position(0, 0), page_text),
      ])
      vscode.workspace.applyEdit(workspaceEdit);
    }, 1);
  }

  // 上传
  public static upload(filePath: string) {
    let pathname = path.parse(Wiki.decode(filePath)).name;
    if (!Wiki.checkConfig()) {
      return;
    }
    if (isEmpty(Wiki.config.bot!.username || '') || isEmpty(Wiki.config.bot!.password || '')) {
      showError('wiki配置错误: bot.username 项和 bot.password 项不能为空', '配置', Wiki.configWiki);
      return false;
    }

    setTimeout(async () => {
      let doc = vscode.workspace.textDocuments[0];
      if (doc.uri.fsPath !== filePath) {
        doc = await vscode.workspace.openTextDocument(filePath);
      }
      doc.save();

      let mw = new MediaWiki(this.config);
      await mw.site_init();
      let page = mw.getPage(pathname);
      await page.initialize();
      let page_text = await page.text();

      let text = doc.getText();
      if (text == page_text) {
        showInfo('当前内容与wiki的一致');
      } else {
        await mw.login();
        await page.edit(text);
      }
    }, 1);
  }

  private static checkConfig(): boolean {
    if (!Wiki.checkWorkspace()) {
      return false;
    }
    if (!fs.existsSync(Wiki.configFile.fsPath)) {
      showError('未配置wiki', '配置', Wiki.configWiki);
      return false;
    }
    let r = fs.readFileSync(Wiki.configFile.fsPath);
    let res: WikiSMTPConfig = JSON.parse(r.toString());
    if (isEmpty(res.host)) {
      showError('wiki配置错误: host项不能为空', '配置', Wiki.configWiki);
      return false;
    }
    Wiki.config = res;
    return true;
  }

  private static openLocalFile(filePath: vscode.Uri | string) {
    if (filePath instanceof vscode.Uri) {
      filePath = filePath.fsPath;
    }
    vscode.workspace.openTextDocument(filePath)
      .then(doc => {
        vscode.window.showTextDocument(doc);
      }, err => {
        console.log(`打开 ${filePath} 失败, ${err}.`);
      }).then(undefined, err => {
        console.log(`打开 ${filePath} 失败, ${err}.`);
      });
    return;
  }

  private static checkWorkspace(): boolean {
    if (Wiki.workspaceDir) {
      return true;
    }
    let workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showInformationMessage('wikismtp 必须在文件夹或者工作区中才能运作');
      return false;
    }
    Wiki.workspaceDir = workspaceFolders[0].uri;
    Wiki.configDir = vscode.Uri.joinPath(Wiki.workspaceDir, '.vscode');
    Wiki.configFile = vscode.Uri.joinPath(Wiki.configDir, 'wikismtp.json');
    return true;
  }
}
