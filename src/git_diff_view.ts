import { html } from 'diff2html';
import type { App, TFile } from 'obsidian';
import DiffView from './abstract_diff_view';
import { GIT_WARNING } from './constants';
import type { DefaultLogFields, vGitItem } from './interfaces';
import type OpenSyncHistoryPlugin from './main';

export default class GitDiffView extends DiffView {
	versions: DefaultLogFields[];
	leftVList: vGitItem[];
	rightVList: vGitItem[];

	constructor(plugin: OpenSyncHistoryPlugin, app: App, file: TFile) {
		super(plugin, app, file);
		this.versions = [];
		this.leftVList = [];
		this.rightVList = [];
	}

	async onOpen() {
		super.onOpen();
		await this.getInitialVersions();
		const diff = this.getDiff();
		this.makeHistoryLists(GIT_WARNING);
		this.basicHtml(diff, 'Git Diff');
		this.appendVersions();
		this.makeMoreGeneralHtml();
	}

	async getInitialVersions(): Promise<void> {
		const { gitManager } = this.app.plugins.plugins['obsidian-git'];
		const gitVersions = await gitManager.log(this.file.path);
		// version on disk
		this.versions.push({
			author_email: '',
			author_name: '',
			body: '',
			date: new Date().toISOString(),
			hash: '',
			message: '',
			refs: '',
		});
		this.versions.push(...gitVersions);
		const diskContent = await this.app.vault.read(this.file);
		const latestCommit = await gitManager.show(
			this.versions[1].hash,
			this.file.path
		);
		[this.leftContent, this.rightContent] = [latestCommit, diskContent];
	}

	appendVersions(): void {
		this.leftVList.push(
			...this.appendGitVersions(this.leftHistory[1], this.versions, true)
		);
		this.rightVList.push(
			...this.appendGitVersions(
				this.rightHistory[1],
				this.versions,
				false
			)
		);
	}

	appendGitVersions(
		el: HTMLElement,
		versions: DefaultLogFields[],
		left: boolean = false
	): vGitItem[] {
		const versionList: vGitItem[] = [];
		for (let i = 0; i < versions.length; i++) {
			const version = versions[i];
			const div = el.createDiv({
				cls: 'sync-history-list-item',
				text: version.message,
			});
			const infoDiv = div.createDiv({
				cls: ['u-small', 'u-muted'],
			});
			const date = infoDiv.createDiv({
				text: version.date,
			});
			const author = infoDiv.createDiv({
				text: version.author_name,
			});
			const hash = infoDiv.createDiv({
				text: version.hash.slice(0, 7),
			});
			hash.style.cursor = 'copy';
			hash.addEventListener('click', async () => {
				await navigator.clipboard.writeText(version.hash);
			});
			versionList.push({
				html: div,
				v: version,
			});
			div.addEventListener('click', async () => {
				if (left) {
					const clickedEl = (await this.generateVersionListener(
						div,
						this.leftVList,
						this.leftActive,
						left
					)) as vGitItem;
					if (this.leftActive === 0) {
						this.leftContent = await this.app.vault.read(this.file);
					} else {
						this.leftContent = await this.app.plugins.plugins[
							'obsidian-git'
						].gitManager.show(clickedEl.v.hash, this.file.path);
					}
					this.syncHistoryContentContainer.innerHTML =
						await this.getDiff();
				} else {
					const clickedEl = (await this.generateVersionListener(
						div,
						this.rightVList,
						this.rightActive
					)) as vGitItem;
					if (this.rightActive === 0) {
						this.rightContent = await this.app.vault.read(
							this.file
						);
					} else {
						this.rightContent = await this.app.plugins.plugins[
							'obsidian-git'
						].gitManager.show(clickedEl.v.hash, this.file.path);
					}
					this.syncHistoryContentContainer.innerHTML =
						await this.getDiff();
				}
			});
		}

		return versionList;
	}
}
