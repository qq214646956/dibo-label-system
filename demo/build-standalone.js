// 构建单文件 demo.html
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { build } from 'esbuild';

const dir = new URL('.', import.meta.url).pathname;

// 1. 读取 demo-init.js
const demoInit = readFileSync(resolve(dir, 'demo-init.js'), 'utf-8');

// 2. bund esbuild le JS (IIFE)
const mainJs = resolve(dir, 'assets/index-CjIWkee1.js');
const result = await build({
    entryPoints: [mainJs],
    bundle: true,
    format: 'iife',
    globalName: 'app',
    write: false,
    minify: false,
});

const bundledJs = demoInit + '\n' + result.outputFiles[0].text;

// 3. 读取 CSS
const cssFile = resolve(dir, 'assets/index-Bh_-Qjqq.css');
const css = readFileSync(cssFile, 'utf-8');

// 4. 生成 HTML
const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>地博标签打印系统 | Demo</title>
<style>${css}</style>
</head>
<body><div id="root"></div>
<script>${bundledJs}</script>
</body>
</html>`;

const out = resolve(dir, '地博标签打印系统_Demo.html');
writeFileSync(out, html, 'utf-8');
console.log(`[OK] ${out} (${(Buffer.byteLength(html)/1024/1024).toFixed(1)}MB)`);
