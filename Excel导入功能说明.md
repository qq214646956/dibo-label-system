# Excel 导入标签模板 — 功能说明

## 功能概述

在设计器中可通过上传 Excel 文件自动生成标签模板。Excel 中的合并单元格会被解析为文本元素，等比缩放到当前标签尺寸内，保留 2mm 最小边距。导入后可在设计器中微调位置和字号。

## 使用流程

```
新建/编辑标签 → 设定标签宽高 → 点击右上角「导入Excel」→ 选择 .xlsx 文件 → 自动生成 → 微调保存
```

**支持映射**：合并单元格 → 文本元素、字号、加粗、对齐（水平/垂直）、边框（实线/虚线）、`{{变量}}` 占位符保留。

**注意**：只导入文本元素，条码/二维码需在设计器中手动添加。

---

## 实现清单（共 5 个文件）

### 1. 安装依赖

```bash
cd 项目目录
pip install openpyxl
# 如果使用 uv：
uv pip install openpyxl
```

### 2. 后端 `sap_server.py`

**2.1 顶部加 import：**
```python
import uuid
import openpyxl
from openpyxl.utils import get_column_letter
```

**2.2 在 `# 启动` 之前插入以下全部代码：**

```python
# =============================================
# Excel 导入 API
# =============================================

@app.route('/api/import-excel', methods=['POST'])
def import_excel():
    """上传 Excel 标签模板，返回 StickerLayout JSON"""

    if 'file' not in request.files:
        return jsonify({'success': False, 'message': '未上传文件'}), 400

    file = request.files['file']
    if not file.filename.endswith(('.xlsx', '.xls')):
        return jsonify({'success': False, 'message': '请上传 .xlsx 文件'}), 400

    try:
        wb = openpyxl.load_workbook(file, data_only=True)
        ws = wb.active

        merged_ranges = list(ws.merged_cells.ranges)
        elements = []
        processed_cells = set()

        # 先处理合并单元格
        for merged in merged_ranges:
            min_row, min_col = merged.min_row, merged.min_col
            max_row, max_col = merged.max_row, merged.max_col

            cell = ws.cell(min_row, min_col)
            content = str(cell.value).strip() if cell.value is not None else ''

            for r in range(min_row, max_row + 1):
                for c in range(min_col, max_col + 1):
                    processed_cells.add((r, c))

            if not content:
                continue

            x_mm, y_mm = _excel_to_mm_pos(ws, min_row, min_col)
            w_mm = _col_range_width_mm(ws, min_col, max_col)
            h_mm = _row_range_height_mm(ws, min_row, max_row)
            style = _extract_cell_style(cell)

            elements.append({
                'id': str(uuid.uuid4())[:8],
                'type': 'text',
                'x': round(x_mm, 1), 'y': round(y_mm, 1),
                'w': round(w_mm, 1), 'h': round(h_mm, 1),
                'content': content, 'style': style
            })

        # 再处理非合并但有内容的单元格
        for row in ws.iter_rows(min_row=1, max_row=ws.max_row,
                                min_col=1, max_col=ws.max_column):
            for cell in row:
                if (cell.row, cell.column) in processed_cells:
                    continue
                content = str(cell.value).strip() if cell.value is not None else ''
                if not content:
                    continue

                x_mm, y_mm = _excel_to_mm_pos(ws, cell.row, cell.column)
                w_mm = _col_width_mm(ws, cell.column)
                h_mm = _row_height_mm(ws, cell.row)
                style = _extract_cell_style(cell)

                elements.append({
                    'id': str(uuid.uuid4())[:8],
                    'type': 'text',
                    'x': round(x_mm, 1), 'y': round(y_mm, 1),
                    'w': round(w_mm, 1), 'h': round(h_mm, 1),
                    'content': content, 'style': style
                })
                processed_cells.add((cell.row, cell.column))

        if not elements:
            return jsonify({'success': False, 'message': 'Excel 中没有找到任何内容'}), 400

        max_right = max(e['x'] + e['w'] for e in elements)
        max_bottom = max(e['y'] + e['h'] for e in elements)
        template_name = file.filename.rsplit('.', 1)[0]

        layout = {
            'id': str(uuid.uuid4())[:8],
            'name': template_name,
            'width': round(max_right, 1),
            'height': round(max_bottom, 1),
            'unit': 'mm',
            'targetEntity': 'delivery',
            'backgroundColor': '#ffffff',
            'elements': elements
        }

        wb.close()
        return jsonify({'success': True, 'data': layout})

    except Exception as e:
        return jsonify({'success': False, 'message': f'解析 Excel 失败: {e}'}), 500


# --- Excel 坐标换算工具函数 ---

def _col_width_mm(ws, col):
    letter = get_column_letter(col)
    cd = ws.column_dimensions.get(letter)
    char_units = cd.width if (cd and cd.width) else 8.43
    px = char_units * 12 if char_units <= 1 else char_units * 7 + 5
    return px / 96 * 25.4


def _row_height_mm(ws, row):
    rd = ws.row_dimensions.get(row)
    pt = rd.height if (rd and rd.height) else 15
    return pt * 0.3528


def _col_range_width_mm(ws, min_col, max_col):
    return sum(_col_width_mm(ws, c) for c in range(min_col, max_col + 1))


def _row_range_height_mm(ws, min_row, max_row):
    return sum(_row_height_mm(ws, r) for r in range(min_row, max_row + 1))


def _excel_to_mm_pos(ws, row, col):
    x_mm = sum(_col_width_mm(ws, c) for c in range(1, col))
    y_mm = sum(_row_height_mm(ws, r) for r in range(1, row))
    return x_mm, y_mm


def _extract_cell_style(cell):
    style = {'fontSize': 10}
    if cell.font:
        if cell.font.size:
            style['fontSize'] = int(cell.font.size)
        if cell.font.bold:
            style['fontWeight'] = 'bold'
        if cell.font.color and cell.font.color.rgb:
            try:
                rgb = cell.font.color.rgb
                if isinstance(rgb, str) and len(rgb) >= 6:
                    if len(rgb) == 8:
                        rgb = rgb[2:]  # ARGB → RGB
                    style['color'] = f'#{rgb}'
                # theme/indexed 色 → 跳过
            except Exception:
                pass
    if cell.alignment:
        h, v = cell.alignment.horizontal, cell.alignment.vertical
        style['textAlign'] = 'left' if h != 'center' and h != 'right' else h
        if h == 'right': style['textAlign'] = 'right'
        if h == 'center': style['textAlign'] = 'center'
        style['verticalAlign'] = 'top' if v != 'center' and v != 'bottom' else v
        if v == 'middle': style['verticalAlign'] = 'middle'
        if v == 'bottom': style['verticalAlign'] = 'bottom'
    if cell.border:
        sides = [cell.border.left, cell.border.right, cell.border.top, cell.border.bottom]
        if any(s and s.style is not None for s in sides):
            style['borderWidth'] = 1
            style['borderColor'] = '#000000'
            style['borderStyle'] = 'solid'
    return style
```

### 3. UI 包 `qrlayout/packages/ui/src/index.ts`

在 `destroy()` 方法之前插入三个公开方法：

```typescript
    /** 更新模板名称（用于 Excel 导入后同步文件名） */
    public setName(name: string) {
        this.currentLayout.name = name;
        this.inputs.name.value = name;
    }

    /** 返回当前布局尺寸（用于 Excel 导入缩放） */
    public getLayout(): { width: number; height: number } {
        return {
            width: this.currentLayout.width,
            height: this.currentLayout.height,
        };
    }

    /** 从外部导入元素列表（如 Excel 导入），替换当前所有元素 */
    public loadElements(elements: StickerElement[]) {
        const existingIds = new Set(this.currentLayout.elements.map(e => e.id));
        elements.forEach(el => {
            while (existingIds.has(el.id)) {
                el.id = (parseInt(el.id, 36) || 0).toString(36) + 'x';
            }
            existingIds.add(el.id);
        });
        this.currentLayout.elements = elements;
        this.selectedElementId = null;
        this.renderElementsList();
        this.renderPropertyPanel();
        this.updatePreview();
    }
```

重建 UI 包：
```bash
cd packages/ui && npm run build
```

### 4. 前端 `qrlayout/examples/react-demo/src/App.tsx`

**4.1 修改 import：**
```typescript
// 原来
import { QRLayoutDesigner, type EntitySchema, type StickerLayout } from 'qrlayout-ui';
import { ArrowLeft, Tag, Truck, Home, Users, LogOut, History } from 'lucide-react';

// 改为
import { QRLayoutDesigner, type EntitySchema, type StickerLayout, type StickerElement } from 'qrlayout-ui';
import { ArrowLeft, Tag, Truck, Home, Users, LogOut, History, FileUp } from 'lucide-react';
```

**4.2 在 `function App()` 之前加缩放函数：**
```typescript
/** 将 Excel 解析出的元素等比缩放到目标标签尺寸内，保留最小边距 */
function scaleElementsToFit(
  elements: StickerElement[],
  excelWidth: number,
  excelHeight: number,
  targetWidth: number,
  targetHeight: number,
): StickerElement[] {
  const PAD = 2;  // 四边最小留白 2mm
  const effW = targetWidth - PAD * 2;
  const effH = targetHeight - PAD * 2;
  const scale = Math.min(effW / excelWidth, effH / excelHeight);

  return elements.map(el => ({
    ...el,
    x: el.x * scale + PAD,
    y: el.y * scale + PAD,
    w: el.w * scale,
    h: el.h * scale,
    style: el.style ? {
      ...el.style,
      fontSize: el.style.fontSize ? Math.round(el.style.fontSize * scale) : undefined,
      borderWidth: el.style.borderWidth ? Math.max(0.5, +(el.style.borderWidth * scale).toFixed(1)) : undefined,
    } : undefined,
  }));
}
```

**4.3 在组件内 `useEffect` 之前添加 ref 和处理函数：**
```typescript
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDesignerImportExcel = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/import-excel', { method: 'POST', body: formData });
      const json = await res.json();
      if (!json.success) {
        alert('导入失败: ' + (json.message || '未知错误'));
        e.target.value = '';
        return;
      }

      const imported = json.data;

      if (subView === 'designer' && designerRef.current) {
        const { width, height } = designerRef.current.getLayout();
        const scaled = scaleElementsToFit(imported.elements, imported.width, imported.height, width, height);
        designerRef.current.loadElements(scaled);
        designerRef.current.setName(imported.name);
      } else {
        setEditingLayout(json.data);
        setSubView('designer');
      }
    } catch {
      alert('导入失败: 服务器连接异常');
    }

    e.target.value = '';
  };
```

**4.4 在 JSX `<div className="min-h-screen bg-gray-50">` 之后插入隐藏文件输入：**
```jsx
      <input
        type="file"
        ref={fileInputRef}
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
```

**4.5 替换设计器视图的工具栏（原来单个返回按钮改成两按钮并排）：**
```jsx
      {subView === 'designer' ? (
        <div className="relative">
          <div className="fixed top-4 left-4 z-[9999] flex gap-2 pointer-events-none">
            <button onClick={handleBackToList}
              className="pointer-events-auto flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium shadow-md transition-all border border-gray-200 cursor-pointer">
              <ArrowLeft size={18} /> 返回标签列表
            </button>
            <button onClick={handleDesignerImportExcel}
              className="pointer-events-auto flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium shadow-md transition-all cursor-pointer"
              title="上传 Excel，自动缩放适配当前标签尺寸">
              <FileUp size={18} /> 导入Excel
            </button>
          </div>
          <div className="designer-container" ref={containerRef} />
        </div>
      ) : (
```

### 5. 同步脚本 `qrlayout/examples/react-demo/setup-chinese.js`

`setup-chinese.js` 中文件同步列表需包含 `.d.ts`，否则 TypeScript 编译报错：

```javascript
// 原来
for (const file of ['qrlayout-ui.js', 'qrlayout-ui.umd.js']) {

// 改为
for (const file of ['qrlayout-ui.js', 'qrlayout-ui.umd.js', 'index.d.ts', 'qrlayout-ui.css']) {
```

### 6. 构建

```bash
# 构建 UI 包
cd qrlayout/packages/core && npm run build
cd qrlayout/packages/ui   && npm run build

# 安装前端依赖（会同步 d.ts）
cd qrlayout/examples/react-demo
npm install

# 构建前端
npm run build
```

---

## 目录对照

| 文件 | 作用 |
|------|------|
| `sap_server.py` | Excel 解析、坐标换算、返回 Layout JSON |
| `qrlayout/packages/ui/src/index.ts` | 设计器暴露 `getLayout()` / `loadElements()` |
| `qrlayout/examples/react-demo/src/App.tsx` | 缩放逻辑、导入按钮、文件上传 |
| `qrlayout/examples/react-demo/setup-chinese.js` | 同步 `.d.ts` 到 node_modules |
| `qrlayout/examples/react-demo/vite.config.ts` | `outDir: '../../../dist'`（可选，确保输出到项目根） |

---

## 缩放逻辑说明

```
pad = 2mm
有效区域 = (标签W - 4mm, 标签H - 4mm)
scale  = min(有效W / ExcelW, 有效H / ExcelH)    ← 等比，不失真
坐标   = Excel坐标 × scale + pad                ← 顶左对齐 + 最小边距
字号   = Excel字号 × scale                       ← 同步缩放
边框   = Excel边框宽 × scale（最小 0.5px）
```

多余空间仅出现在右侧和底部，不会上下左右均匀分散。

---

## 踩坑记录

### 1. Excel 主题色导致文字不可见

**现象**：导入后模板上有元素，点击属性面板能看到内容，但画布上不显示。

**根因**：Excel 使用 **theme 主题色**（非直接 RGB）时，openpyxl 的 `cell.font.color.rgb` 返回的是内部对象而非字符串。`str()` 后得到无效 CSS 颜色值（如 `"Values must be of type <class 'str'>"`）。Canvas 遇到无效 `fillStyle` 会保留上一次的颜色——恰好是背景填充后的白色，导致**白字画在白底上**。

**修复**：`_extract_cell_style` 中加类型检查，遇到 theme/indexed 色直接跳过，不设 `color` 属性（Canvas 默认黑色）：

```python
if cell.font.color and cell.font.color.rgb:
    try:
        rgb = cell.font.color.rgb
        if isinstance(rgb, str) and len(rgb) >= 6:  # 仅字符串 RGB
            if len(rgb) == 8:
                rgb = rgb[2:]  # ARGB → RGB
            style['color'] = f'#{rgb}'
        # theme/indexed 色 → 跳过
    except Exception:
        pass
```

### 2. TypeScript 报 `getLayout` / `loadElements` 不存在

**根因**：`setup-chinese.js` 只同步了 `.js` 文件到 `node_modules`，没同步 `.d.ts` 类型声明。

**修复**：同步列表加上 `'index.d.ts'`。

### 3. 导入后模板名仍是「新建标签」

**根因**：`loadElements()` 只替换元素，不更新模板名。

**修复**：设计器加 `setName(name)` 公开方法，导入后调用 `designerRef.current.setName(imported.name)`。

### 4. 导入按钮挡住右侧属性面板

**根因**：按钮用 `justify-between` 分到右侧，和属性面板重叠。

**修复**：两按钮都放左侧，`flex gap-2` 并排显示。
