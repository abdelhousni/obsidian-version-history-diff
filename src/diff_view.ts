import { Diff2HtmlConfig, html } from 'diff2html';
import { App, Modal, Notice, TFile } from 'obsidian';
import type { gHResult, rVListItem, vListItem, recResult } from './interfaces';
import type OpenSyncHistoryPlugin from './main';
import { createTwoFilesPatch } from 'diff';
import FileModal from './file_modal';
import { SYNC_WARNING } from './constants';
import DiffView from './abstract_diff_view';

function getSize(size: number): string {
	if (size === 0) {
		return '0';
	} else {
		return (size / 1000).toString().slice(0, -1);
	}
}

export default class SyncDiffView extends DiffView {
	versions: gHResult; // only thing that will be different
	leftVList: vListItem[];
	rightVList: vListItem[];

	constructor(plugin: OpenSyncHistoryPlugin, app: App, file: TFile) {
		super(plugin, app, file);
		//@ts-expect-error, will be filled with the correct data later
		this.versions = {};
		this.leftVList = [];
		this.rightVList = [];
	}

	async onOpen() {
		super.onOpen();
		await this.getInitialVersions();
		const diff = this.getDiff();
		this.makeHistoryLists(SYNC_WARNING);
		this.makeButtons();
		this.basicHtml(diff);
		this.appendVersions();
		this.makeMoreGeneralHtml();
	}

	async getInitialVersions() {
		// get first thirty versions
		this.versions = await this.plugin.diff_utils.getVersions(this.file);
		// for initial display, initialise variables
		let [latestV, secondLatestV] = [0, 0];
		// only display if at least two versions
		if (this.versions.items.length > 1) {
			latestV = this.versions.items[0].uid;
			secondLatestV = this.versions.items[1].uid;
		} else {
			this.close();
			new Notice('There are not at least two versions.');
			return;
		}

		// get function
		const getContent = this.plugin.diff_utils.getContent.bind(this);

		// choose two latest versions
		[this.leftContent, this.rightContent] = [
			await getContent(secondLatestV),
			await getContent(latestV),
		];
	}

	appendVersions() {
		// add the inner HTML element (the sync list) and keep a record
		// of references to the elements
		this.leftVList.push(
			...this.appendSyncVersions(this.leftHistory[1], this.versions, true)
		);
		this.rightVList.push(
			...this.appendSyncVersions(this.rightHistory[1], this.versions, false)
		);
	}



	makeButtons() {
		// create more button
		const leftMoreButton = this.leftHistory[0].createDiv({
			cls: ['sync-history-load-more-button', 'diff'],
			text: 'Load more',
		});
		const rightMoreButton = this.rightHistory[0].createDiv({
			cls: ['sync-history-load-more-button', 'diff'],
			text: 'Load more',
		});
		this.setMoreButtonStyle(leftMoreButton, rightMoreButton);

		for (const el of [leftMoreButton, rightMoreButton]) {
			el.addEventListener('click', async () => {
				const newVersions = await this.plugin.diff_utils.getVersions(
					this.file,
					this.versions.items.last()?.uid
				);
				this.versions.more = newVersions.more;
				this.setMoreButtonStyle(leftMoreButton, rightMoreButton);

				// append new versions to sync list
				this.leftVList.push(
					...this.appendSyncVersions(
						this.leftHistory[1],
						newVersions,
						true
					)
				);
				this.rightVList.push(
					...this.appendSyncVersions(
						this.rightHistory[1],
						newVersions,
						false
					)
				);
				// add new versions to version list
				// gets one type of data
				this.versions.items.push(...newVersions.items);
			});
		}
	}


	setMoreButtonStyle(
		leftMoreButton: HTMLDivElement,
		rightMoreButton: HTMLDivElement
	) {
		if (this.versions.more) {
			leftMoreButton.style.display = 'block';
			rightMoreButton.style.display = 'block';
		} else {
			leftMoreButton.style.display = 'none';
			rightMoreButton.style.display = 'none';
		}
	}


	appendSyncVersions(
		el: HTMLElement,
		versions: gHResult,
		left: boolean
	): vListItem[] {
		const versionList: vListItem[] = [];
		for (let version of versions.items) {
			const date = new Date(version.ts);
			const div = el.createDiv({
				cls: 'sync-history-list-item',
				text: date.toDateString() + ', ' + date.toLocaleTimeString(),
			});
			const infoDiv = div.createDiv({
				cls: ['u-small', 'u-muted'],
				text: getSize(version.size) + ' KB [' + version.device + ']',
			});
			versionList.push({
				html: div,
				v: version,
			});
			div.addEventListener('click', async () => {
				if (left) {
					const clickedEl = await this.generateVersionListener(
						div,
						this.leftVList,
						this.leftActive,
						left
					);
					await this.getSyncContent(clickedEl, left);
					this.syncHistoryContentContainer.innerHTML = this.getDiff();
				} else {
					const clickedEl = await this.generateVersionListener(
						div,
						this.rightVList,
						this.rightActive
					);
					await this.getSyncContent(clickedEl);
					this.syncHistoryContentContainer.innerHTML = this.getDiff();
				}
			});
		}
		return versionList;
	}



	private async getSyncContent(clickedEl: vListItem, left: boolean = false) {
		// get the content for the clicked HTML element
		const getContent = this.plugin.diff_utils.getContent.bind(this);
		if (left) {
			this.leftContent = await getContent(clickedEl.v.uid);
		} else {
			this.rightContent = await getContent(clickedEl.v.uid);
		}
	}
}
