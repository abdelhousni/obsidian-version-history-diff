import {App, MarkdownRenderer, Modal, Notice, sanitizeHTMLToDom, TFile } from "obsidian";
import type OpenSyncHistoryPlugin from './main'

export default class FileModal extends Modal {
	raw: boolean;

	constructor(private plugin: OpenSyncHistoryPlugin, public app: App, private syncFile: string, private file: TFile) {
		super(app);
		this.plugin = plugin
		this.app = app
		this.file = file
		this.syncFile = syncFile
		this.raw = false

	}

	async onOpen() {
		super.onOpen()

		const restoreButton = this.contentEl.createEl('button', {
			cls: [ 'mod-cta', 'restore' ],
			text: `Replace ${this.file.basename} content with this version`
		})
		const switchButton = this.contentEl.createEl('button', {
			cls: [ 'mod-cta', 'switch'],
			text: 'Show raw text'
		})

		const el = this.contentEl.createDiv();

		switchButton.addEventListener('click', () => {
			if (!this.raw) {
				const lines = this.syncFile.split('\n')
				let linesWithBrs = '<br />'
				for (const line of lines) {
					linesWithBrs += line
					linesWithBrs += '<br />'
				}
				//const html = sanitizeHTMLToDom(BrString)
				el.empty()
				el.innerHTML = linesWithBrs
				//el.innerHTML = this.syncFile
				this.raw = !this.raw
				switchButton.innerText = 'Show Reading view'
			} else {
				this.raw = !this.raw;
				(async () => {
					el.empty()
					await MarkdownRenderer.renderMarkdown(this.syncFile, el, this.file.path, null)
				})();
				switchButton.innerText = 'Show raw text'
			}
		})

		restoreButton.addEventListener('click', () => {
			(async () => {
				await this.app.vault.modify(this.file, this.syncFile)
			})();
			new Notice(`The file ${this.file.basename} file has been overwritten with the selected version.`)
			this.close()
		})

		await MarkdownRenderer.renderMarkdown(this.syncFile, el, null, null)
	}

}
