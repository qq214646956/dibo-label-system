// ========================================
// 地博标签打印系统 — 本地 Demo 版本
// 拦截所有 fetch 调用，用本地 mock 数据 + localStorage 替代后端
// ========================================

// 跳过登录，自动以设计员身份进入
sessionStorage.setItem('user', JSON.stringify({
    id: 1, username: '_demo', display_name: '', role: 'designer'
}));

// 隐藏用户标识和退出按钮（纯演示模式）
const style = document.createElement('style');
style.textContent = '.demo-hide{display:none!important}';
document.head.appendChild(style);

(function() {
'use strict';

// --- 演示模式下隐藏用户UI ---
const observer = new MutationObserver(() => {
    // 隐藏退出按钮
    document.querySelectorAll('button').forEach(b => {
        if (b.textContent?.includes('退出')) b.classList.add('demo-hide');
    });
    // 隐藏空用户名标签
    document.querySelectorAll('span').forEach(s => {
        if (s.textContent?.trim() === '' && s.className.includes('rounded')) s.classList.add('demo-hide');
    });
});
observer.observe(document.body, { childList: true, subtree: true });

// --- Mock 出货数据 ---
const MOCK_DELIVERY_DATA = Array.from({length: 20}, (_, i) => ({
    VBELN: `0080000${String(123 + i)}`,
    POSNR: `0000${10 + i}`,
    VGBEL: `0001000${String(123 + i)}`,
    VGPOS: '000010',
    MATNR: `3001-0000${i+1}-00003`,
    MAKTX: `铜带&${(0.3 + i*0.1).toFixed(1)}×200×C1100`,
    PM: '铜带',
    GROES: `0.5×200`,
    KDMAT: `CUST-MAT-00${i+1}`,
    ARKTX: '铜带 C1100',
    LFIMG: (1000 + i * 50).toFixed(3),
    LFIMG_HY: (800 + i * 40).toFixed(3),
    MEINS: 'KG',
    CHARG: `202605${String(1+i).padStart(2,'0')}`,
    ZFZSL: '4.000',
    ZFZDW: 'ROL',
    ZBZCD: `${180 + i * 10}`,
    ZBZKD: `${(0.3 + i * 0.1).toFixed(1)}`,
    ZBZHD: '0.01',
    ZBZBZ: '8.9',
    ZBZZL: '250',
    ZHYZL: '0.8',
    ZBZCD2: '200',
    ZBZKD2: '0.5',
    KUNNR: '0000100001',
    NAME1: `客户${String.fromCharCode(65+i)}`,
    SORTL: `客户${String.fromCharCode(65+i)}`,
    USERNAME: 'IT01',
    ERDAT: '2026-05-20',
    WADAT_IST: `2026-05-${String(21-i).padStart(2,'0')}`,
    DATETIME: '', DATE: '', TIME: '',
}));

// --- LocalStorage Keys ---
const LS_TEMPLATES = 'demo_templates';
const LS_LOGS = 'demo_logs';

function getStore(key, fallback) {
    try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : fallback; }
    catch { return fallback; }
}
function setStore(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

// Init default template
if (!localStorage.getItem(LS_TEMPLATES)) {
    setStore(LS_TEMPLATES, {
        'default-delivery-layout': {
            id: 'default-delivery-layout', name: '出货标签', targetEntity: 'delivery',
            width:100, height:70, unit:'mm', backgroundColor:'#ffffff',
            elements: [
                { id:'d1', type:'text', x:30, y:5, w:65, h:6, content:'{{NAME1}}', style:{ fontSize:10, fontWeight:'bold' } },
                { id:'d2', type:'text', x:30, y:13, w:65, h:8, content:'{{MAKTX}}', style:{ fontSize:14, fontWeight:'bold' } },
                { id:'d3', type:'text', x:30, y:24, w:35, h:6, content:'单号: {{VBELN}}', style:{ fontSize:9 } },
                { id:'d4', type:'text', x:30, y:32, w:35, h:6, content:'数量: {{LFIMG}} {{MEINS}}', style:{ fontSize:9 } },
                { id:'d5', type:'text', x:30, y:40, w:35, h:6, content:'批次: {{CHARG}}', style:{ fontSize:9 } },
                { id:'d8', type:'qr', x:5, y:15, w:22, h:22, content:'{{VBELN}}' },
                { id:'d9', type:'text', x:5, y:40, w:22, h:5, content:'{{PM}}', style:{ fontSize:7, textAlign:'center' } }
            ]
        }
    });
}
if (!localStorage.getItem(LS_LOGS)) setStore(LS_LOGS, []);

// --- Mock API Router ---
window.fetch = async function(url, options = {}) {
    const u = typeof url === 'string' ? url : url.url;
    const method = (options.method || 'GET').toUpperCase();
    const body = options.body ? JSON.parse(options.body) : {};

    // URL → path
    let path = u.replace(/\?.*/, '');
    path = path.replace(/^(https?|file):\/\/[^\/]+/, '');
    if (!path.startsWith('/')) path = '/' + (path.split('://').pop() || '').replace(/^[^\/]*/, '');

    const getParam = (name) => {
        const p = new URLSearchParams(u.includes('?') ? u.split('?')[1] : '');
        return p.get(name) || '';
    };

    const res = (data, status=200) => new Response(JSON.stringify(data), {
        status, headers: {'Content-Type':'application/json'}
    });

    // --- Login (always succeed) ---
    if (path === '/api/login') {
        return res({ success:true, user:{ id:1, username:'admin', display_name:'管理员', role:'admin' } });
    }

    // --- Templates ---
    if (path === '/api/templates' && method === 'GET') {
        const templates = getStore(LS_TEMPLATES, {});
        return res({ success:true, data: Object.values(templates) });
    }
    if (path === '/api/templates' && method === 'POST') {
        const templates = getStore(LS_TEMPLATES, {});
        const operator = getParam('operator');
        const existed = !!templates[body.id];
        templates[body.id] = body;
        setStore(LS_TEMPLATES, templates);
        const logs = getStore(LS_LOGS, []);
        logs.unshift({ id:Date.now(), template_id:body.id, template_name:body.name||'', action:existed?'UPDATE':'CREATE', operator, created_at:new Date().toISOString().replace('T',' ').substring(0,19) });
        setStore(LS_LOGS, logs.slice(0,200));
        return res({ success:true, id:body.id });
    }
    if (path.startsWith('/api/templates/') && method === 'DELETE') {
        const tid = path.split('/').pop();
        const templates = getStore(LS_TEMPLATES, {});
        const operator = getParam('operator');
        const tname = templates[tid]?.name || tid;
        delete templates[tid];
        setStore(LS_TEMPLATES, templates);
        const logs = getStore(LS_LOGS, []);
        logs.unshift({ id:Date.now(), template_id:tid, template_name:tname, action:'DELETE', operator, created_at:new Date().toISOString().replace('T',' ').substring(0,19) });
        setStore(LS_LOGS, logs.slice(0,200));
        return res({ success:true });
    }

    // --- Users (stub) ---
    if (path === '/api/users' && method === 'GET') {
        return res({ success:true, data: [{ id:1, username:'admin', display_name:'管理员', role:'admin', created_at:'2026-05-20' }] });
    }
    if (path === '/api/users' && method === 'POST') {
        return res({ success:true, id: Date.now() });
    }
    if (path.startsWith('/api/users/') && method === 'DELETE') {
        return res({ success:true });
    }

    // --- Template Logs ---
    if (path === '/api/template-logs') {
        return res({ success:true, data: getStore(LS_LOGS, []) });
    }

    // --- Delivery Details ---
    if (path === '/api/delivery-details') {
        await new Promise(r => setTimeout(r, 300));
        return res({ success:true, count: MOCK_DELIVERY_DATA.length, data: MOCK_DELIVERY_DATA });
    }

    // Fallback
    return new Response(JSON.stringify({ success:false, message:'Not found' }), { status:404, headers:{'Content-Type':'application/json'} });
};

console.log('[Demo] 本地演示版就绪 — 无需登录');
})();
