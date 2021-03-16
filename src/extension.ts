
import { ExtensionContext, commands, window, ProgressOptions, ProgressLocation, OutputChannel } from 'vscode'
import * as Fs from 'fs';
import * as Path from 'path';
import { clearInterval } from 'timers';

export function activate(context: ExtensionContext) {

	let metaDataObj = JSON.parse(Fs.readFileSync(Path.join(context.extensionPath, 'metadatasimple.json'), 'utf-8'));

	const query = commands.registerCommand('metadata-query.query', () => {
		const editor = window.activeTextEditor;
		if (!editor) { return; }
		const selection = editor.selection;
		const text = editor.document.getText(selection);
		metadataQuery(text, metaDataObj)
	});

	context.subscriptions.push(query);

	let input = commands.registerCommand('metadata-query.input', async () => {
		const text: string = await window.showInputBox({
			placeHolder: '请输入要查询的内容'
		}) || ''
		metadataQuery(text, metaDataObj)
	});

	context.subscriptions.push(input);
}

function metadataQuery(text: string, metaDataObj: any) {
	if (!text) return
	if (text && text.length > 30) return
	if (text.indexOf('.') > -1) return
	if (text.indexOf('(') > -1) return
	if (text.indexOf(':') > -1) return
	if (text.indexOf('//') > -1) return
	if (text.indexOf(';') > -1) return


	const str = `${text}`.trim().replace(/\'|\"/g, '');

	const results: string[] = [];

	const notification = new Notification(str);

	// Entity
	if (/\w/.test(str)) {
		if (metaDataObj[str]) {
			results.push(`Entity : [${str}: ${metaDataObj[str]['displayText']}]`)
		}
	} else {
		for (const entity in metaDataObj) {
			if (metaDataObj[entity].displayText === str) {
				results.push(`Entity : [${entity}: ${str}]`)
			}
		}
	}
	
	// Field
	for (const entity in metaDataObj) {
		let fields = metaDataObj[entity]['fields'];
		if (/\w/.test(str)) {
			if (fields[str]) {
				results.push(`Field [${str}: ${metaDataObj[entity]['fields'][str]['displayText']}] 来自 [${entity}: ${metaDataObj[entity]['displayText']}]`)
			}
		} else {
			for (const field in fields) {
				if (str === fields[field]['displayText']) {
					results.push(`Field [${field}: ${str}] 来自 [${entity}: ${metaDataObj[entity]['displayText']}]`)
				}
			}
		}
		
	}
	notification.stop(results)
}

export function deactivate() { }

export class Notification {
	private isStop = false;
	private res: string[] = [];

	private options: ProgressOptions = {
		location: ProgressLocation.Notification,
		title: 'loding...'
	};

	constructor(keyword: string) {
		if (keyword) {
			this.options.title = `搜索: ${keyword}`;
		}
		this.start(keyword);
	}

	async start(keyword: string) {
		this.isStop = false;
		window.withProgress(this.options, async () => {
			await new Promise((resolve) => {
				const interval = setInterval(() => {
					if (this.isStop) {
						clearInterval(interval);
						resolve(undefined);
					}
				}, 500);
			});

			if (this.res.length > 1) { // 多条在输出中显示
				const opc = window.createOutputChannel(`metadata-${keyword}`); // 输入显示的名称，多个输出共存
				opc.clear(); // 清空
				this.res.forEach(res => {
					opc.appendLine(res);
				})
				opc.show(); // 打开控制台并切换到OutputChannel tab
			} else if (this.res.length === 1) { // 一条使用消息格式输出
				window.showInformationMessage(this.res[0])
			} else {
				window.showWarningMessage('找不到对应数据')
			}
		});
	}

	public stop(res: string[]) {
		this.isStop = true;
		this.res = res;
	}
}



// 简化 metadata

// type entity = {
// 	displayText: string,
// 	fields: {
// 		[field: string]: {
// 			displayText: string
// 		}
// 	}
// }

// let obj: {
// 	[entity: string]: entity
// } = {}

// Object.keys(metaDataObj).forEach(entity => {
// 	obj[entity] = {
// 		displayText: '',
// 		fields: {}
// 	}
// 	obj[entity]['displayText'] = metaDataObj[entity].displayText
// 	Object.keys(metaDataObj[entity].fields).forEach(field => {
// 		obj[entity]['fields'][field] = {
// 			displayText: metaDataObj[entity].fields[field].displayText
// 		}
// 	})
// })

// console.log(obj);
// Fs.writeFileSync(Path.join(context.extensionPath, 'metadatasimple.json'), JSON.stringify(obj), 'utf-8')