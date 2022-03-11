// Thank you: https://github.com/aidenlx/media-extended/blob/main/esbuild.js
import esbuild from 'esbuild';
import fs from 'fs';
import process from 'process';
import builtins from 'builtin-modules';

const banner = `/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
If you want to view the source, visit the plugin’s github repository:
https://github.com/kometenstaub/obsidian-sync-version-history

This plugin is MIT-licensed:

	MIT License
	
	Copyright (c) 2022 kometenstaub
	
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	
	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.
	
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
	
*/
`;

const copyManifest = {
	name: 'copy-manifest',
	setup: (build) => {
		build.onEnd(() => {
			fs.copyFileSync('manifest.json', 'build/manifest.json');
			fs.copyFileSync('src/styles.css', 'build/styles.css')
		});
	},
};

const isProd = process.env.BUILD === 'production';

(async () => {
	try {
		await esbuild.build({
			entryPoints: ['src/main.ts'],
			bundle: true,
			watch: !isProd,
			//platform: 'browser',
			external: ['obsidian', 'electron', ...builtins],
			format: 'cjs',
			target: 'es2018',
			banner: { js: banner },
			sourcemap: isProd ? false : 'inline',
			minify: isProd,
			logLevel: 'info',
			treeShaking: true,
			define: {
				'process.env.NODE_ENV': JSON.stringify(process.env.BUILD),
			},
			outfile: 'build/main.js',
			plugins: [copyManifest],
		});
	} catch (err) {
		console.error(err);
		process.exit(1);
	}
})();
