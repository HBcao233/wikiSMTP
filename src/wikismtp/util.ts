import * as vscode from 'vscode';

export interface dict {
  [propName: string]: any;
}

export function isEmpty(s: any) {
  if (s === undefined || s === null || s === '') {
    return true;
  }
  return false;
}

export function isNumber(s: any) {
  if (typeof s === 'number') {
    return true;
  }
  return false;
}

export function isString(s: any) {
  if (typeof s === 'string') {
    return true;
  }
  return false;
}

export function http_build_query(obj: dict): string {
  let res = '';
  for (const k in obj) {
    res += `${k}=${obj[k]}`;
  }
  return res;
}

export function openLocalFile(filePath: vscode.Uri | string) {
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

export function showInfo(str1: string, str2?: string, func?: Function) {
  vscode.window.showInformationMessage(str1, str2 || '')
    .then(async r => {
      if (str2 != '' && r == str2) {
        func && func();
      }
    });
}

export function showWarning(str1: string, str2?: string, func?: Function) {
  vscode.window.showWarningMessage(str1, str2 || '')
    .then(async r => {
      if (str2 !== '' && r === str2) {
        func && func();
      }
    });
}

export function showError(str1: string, str2?: string, func?: Function) {
  vscode.window.showErrorMessage(str1, str2 || '')
    .then(async r => {
      if (str2 !== '' && r === str2) {
        func && func();
      }
    });
}

export function raise(msg: string) {
  showError(msg);
  throw Error(msg);
}
