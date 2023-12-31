# wikiSMTP README
<a href="https://github.com/HBcao233/wikiSMTP/blob/main/LICENSE">
  <img src="https://img.shields.io/github/license/HBcao233/wikiSMTP" alt="license">
</a>

## 功能

mediawiki的下载和上传

## 依赖

插件 [wikitext](https://marketplace.visualstudio.com/items?itemName=RoweWilsonFrederiskHolme.wikitext)

## 插件设置
首先打开文件夹或工作区

使用快捷键 `Ctrl` + `Shift` + `P` 打开运行命令，搜索 `wikismtp`，选择 `wikiSMTP: 配置` 命令，会自动在当前文件夹创建如下配置：
```
{
  "host": "",
  "bot": {
    "username": "",
    "password": ""
  },
  "ua": ""
}
```
* `host`: mediawiki的域名，例如: `www.mediawiki.org`、`www.huijiwiki.com`
* `bot`: 可选，需要使用上传功能时需要填写此项，用于登录mediawiki机器人, 请在 `特殊:BotPasswords` 页面申请机器人密码
	* `bot.username`: 机器人用户名, 格式: 账号名@机器人名称
	* `bot.password`: 机器人密码
* `ua`: 可选，自定义 User-Agent

## 使用方法
本插件包含下载和上传两个功能，有以下特色：
* 以文件名作为页面名，由于文件名不能包含一些特殊符号，会对以下字符进行转义
  | 特殊字符 | 转义         |
  | -------- | ------------ |
  | `:`      | `_` 或 `_2_` |
  | `\`      | `_0_`        |
  | `/`      | `_1_`        |
  | `*`      | `_3_`        |
  | `"`      | `_4_`        |
  
* 配置好后在编辑器中右键，或右键文件、文件夹即可使用下载、上传功能
* 上传时将使用 `/* Edit ${页面名} by VSCode wikiSMTP Extensions */ ` 作为编辑摘要
* 需要使用上传功能请配置 `bot.username` 项和 `bot.password`项
* `3 下载页面到当前文件夹 From wiki` 会要求输入页面名，页面名无需转义
