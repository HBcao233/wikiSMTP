import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { BufferBigEndian } from './str';
import { MediaWiki } from './mediawiki';
import { isEmpty, showError, raise, showInfo, showWarning, openLocalFile } from './util';
import browser from './browser';

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
      .replace(':', '_')
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
          openLocalFile(Wiki.configFile);
        });
      return;
    }
    openLocalFile(Wiki.configFile);
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
      if (page_text === '') {
        showInfo(`页面 "${page.name}" 在wiki不存在`)
        return;
      }

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
      if (doc.getText() == page_text) {
        showInfo('当前内容与wiki的一致');
      } else {
        // let editor = vscode.window.activeTextEditor;
        let last_line = doc.lineAt(doc.lineCount - 1);
        let r = new vscode.Range(0, 0, doc.lineCount - 1, last_line.text.length);
        let workspaceEdit = new vscode.WorkspaceEdit();
        workspaceEdit.set(doc.uri, [
          vscode.TextEdit.delete(r),
          vscode.TextEdit.insert(new vscode.Position(0, 0), page_text),
        ])
        vscode.workspace.applyEdit(workspaceEdit);
        showInfo(`页面 "${page.name}" 下载成功`);
      }
    }, 1);
  }

  // 上传
  public static upload(filePath: string) {
    let pathname = path.parse(Wiki.decode(filePath)).name;
    if (!Wiki.checkConfig()) {
      return;
    }
    if (isEmpty(Wiki.config.bot!.username || '') || isEmpty(Wiki.config.bot!.password || '')) {
      showError('wikiSMTP配置错误: 需要 bot.username 和 bot.password 项', '配置', Wiki.configWiki);
      return false;
    }

    setTimeout(async () => {
      let doc = vscode.workspace.textDocuments[0];
      if (doc.uri.fsPath !== filePath) {
        doc = await vscode.workspace.openTextDocument(filePath);
      }
      doc.save();

      let mw = new MediaWiki(Wiki.config);
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

  // 下载至当前文件夹
  public static downloadToDir(pathName: string) {
    if (!Wiki.checkConfig()) {
      return;
    }

    let stat = fs.lstatSync(pathName);
    if (stat.isFile()) {
      pathName = path.dirname(pathName);
    }
    var pathUri = vscode.Uri.parse(pathName);
    console.log(pathUri);

    vscode.window.showInputBox({
      password: false,
      ignoreFocusOut: true, // 默认false，设置为true时鼠标点击别的地方输入框不会消失
      placeHolder: '请输入页面名 (无需转义)', // 在输入框内的提示信息
      prompt: 'Enter 确定, ESC 取消', // 在输入框下方的提示信息
    }).then(async function (pagename) {
      pagename = String(pagename);
      if (isEmpty(pagename)) {
        return showWarning('输入为空, 已取消');
      }

      let filename = Wiki.encode(pagename);
      let ext = 'wiki';

      let mw = new MediaWiki(Wiki.config);
      await mw.site_init();
      let page = mw.getPage(pagename);
      await page.initialize();
      if (!page.exists) {
        showWarning(`页面 "${page.name}" 不存在`);
      }
      let page_text = await page.text();
      if (page.namespace == 828 || page.contentmodel == 'Scribunto') {
        ext = 'lua';
      }

      let buf = new BufferBigEndian();
      buf.pushStringWithUtf8(page_text);

      let filePath = path.join(pathName, filename + '.' + ext);
      let fileUri: vscode.Uri = vscode.Uri.file(filePath);
      vscode.workspace.fs.writeFile(fileUri, buf.toUint8Array())
        .then(() => {
          openLocalFile(fileUri);
        });
    });
  }

  // 打开当前wiki页面
  public static openUrl(filePath: string) {
    let pathname = path.parse(Wiki.decode(filePath)).name;
    if (!Wiki.checkConfig()) {
      return;
    }

    browser.open("https://" + Wiki.config.host + '/wiki/' + pathname, browser.standardizedBrowserName())
  }

  public static checkConfig(): boolean {
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
      showError('wikiSMTP配置错误: host项不能为空', '配置', Wiki.configWiki);
      return false;
    }
    Wiki.config = res;
    return true;
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
