import * as vscode from "vscode";

const english = {
  manualAliasLabel: "$(edit) Enter an SSH Host alias…",
  sshConfigHostDescription: "SSH config Host",
  manualAliasDescription: "Use an alias from another included config file",
  selectProfileTitle: "Select local SSH profile for {0}",
  selectProfilePlaceholder: "This choice is remembered only for this remote server",
  enterAliasTitle: "Enter SSH Host alias",
  aliasPlaceholder: "SAI-8V100",
  enterAliasPrompt: "The alias is resolved by your local OpenSSH configuration.",
  aliasInvalid: "Enter an alias without spaces or shell characters.",
  commandCopied: "Copied SSH command: {0}"
};

const chinese: typeof english = {
  manualAliasLabel: "$(edit) 输入 SSH Host 别名…",
  sshConfigHostDescription: "SSH config 的 Host",
  manualAliasDescription: "使用另一份 Include 配置文件中的别名",
  selectProfileTitle: "为 {0} 选择本机 SSH 配置",
  selectProfilePlaceholder: "该选择只会为此远程服务器记忆",
  enterAliasTitle: "输入 SSH Host 别名",
  aliasPlaceholder: "SAI-8V100",
  enterAliasPrompt: "该别名将由本机 OpenSSH 配置解析。",
  aliasInvalid: "请输入不含空格或 Shell 特殊字符的别名。",
  commandCopied: "已复制 SSH 命令：{0}"
};

type TranslationKey = keyof typeof english;

export function t(key: TranslationKey, ...values: string[]): string {
  const dictionary = vscode.env.language.toLowerCase().startsWith("zh") ? chinese : english;
  return values.reduce((message, value, index) => message.replace(`{${index}}`, value), dictionary[key]);
}
