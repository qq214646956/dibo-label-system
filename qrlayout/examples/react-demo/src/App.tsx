// App.tsx
import { useEffect, useRef, useState } from 'react';
import { QRLayoutDesigner, type EntitySchema, type StickerLayout, type StickerElement } from 'qrlayout-ui';
import 'qrlayout-ui/style.css';
import './App.css';
import { LabelList } from './features/labels/LabelList';
import { storage } from './services/storage';
import { ArrowLeft, Tag, Truck, Users, LogOut, History, FileUp } from 'lucide-react';
import { EmployeeMaster } from './features/employees/EmployeeMaster';
import { LoginPage, type UserInfo } from './features/auth/LoginPage';
import { UserManagePage } from './features/auth/UserManagePage';
import { TemplateLogPage } from './features/auth/TemplateLogPage';

// Sample Schema - 出货主数据（字段来源：SAP RFC ZFM_ZSDELIVERY_DETAILS）
const SAMPLE_SCHEMAS: Record<string, EntitySchema> = {
  delivery: {
    label: "出货主数据",
    fields: [
      { name: "VBELN", label: "交货单号" },
      { name: "POSNR", label: "交货单行号" },
      { name: "VGBEL", label: "销售凭证" },
      { name: "VGPOS", label: "销售凭证项目号" },
      { name: "WADAT_IST", label: "过账日期" },
      { name: "ERDAT", label: "创建日期" },
      { name: "MATNR", label: "物料编码" },
      { name: "MAKTX", label: "物料描述" },
      { name: "PM", label: "品名" },
      { name: "GROES", label: "规格型号" },
      { name: "KDMAT", label: "客户物料" },
      { name: "ARKTX", label: "销售订单项目短文本" },
      { name: "LFIMG", label: "实际已交系统重量" },
      { name: "LFIMG_HY", label: "实际已交行业重量" },
      { name: "MEINS", label: "单位" },
      { name: "CHARG", label: "批次编号" },
      { name: "ZFZSL", label: "辅助数量" },
      { name: "ZFZDW", label: "辅助单位" },
      { name: "ZBZCD", label: "标长(M)" },
      { name: "ZBZKD", label: "标宽（MM）" },
      { name: "ZBZHD", label: "标厚（MM）" },
      { name: "ZBZBZ", label: "比重" },
      { name: "ZBZZL", label: "标重" },
      { name: "ZHYZL", label: "行重" },
      { name: "ZBZCD2", label: "行业长度(M)" },
      { name: "ZBZKD2", label: "行业宽度（MM）" },
      { name: "KUNNR", label: "客户编码" },
      { name: "NAME1", label: "客户名称" },
      { name: "SORTL", label: "客户简称" },
      { name: "USERNAME", label: "过账人" },
      { name: "EX_TEXT", label: "销售订单抬头文本" },
      { name: "DATE", label: "打印日期" },
      { name: "TIME", label: "打印时间" },
      { name: "DATETIME", label: "打印日期时间" },
    ],
    sampleData: {
      VBELN: "0080000123",
      POSNR: "000010",
      VGBEL: "0001000123",
      VGPOS: "000010",
      WADAT_IST: "2026-05-21",
      ERDAT: "2026-05-20",
      MATNR: "3001-00001-00003",
      MAKTX: "铜带&0.5×200×C1100",
      PM: "铜带",
      GROES: "0.5×200",
      KDMAT: "CUST-MAT-001",
      ARKTX: "铜带 C1100",
      LFIMG: "1250.000",
      LFIMG_HY: "1000.000",
      MEINS: "KG",
      CHARG: "20260501",
      ZFZSL: "4",
      ZFZDW: "ROL",
      ZBZCD: "200",
      ZBZKD: "0.5",
      ZBZHD: "0.01",
      ZBZBZ: "8.9",
      ZBZZL: "250",
      ZHYZL: "0.8",
      ZBZCD2: "200",
      ZBZKD2: "0.5",
      KUNNR: "0000100001",
      NAME1: "地博铜业有限公司",
      SORTL: "地博铜业",
      USERNAME: "IT01",
      EX_TEXT: "合同号: HT2026-001\n订单备注: 加急发货\n包装要求: 木托包装",
      DATE: "2026-05-25",
      TIME: "14:30:00",
      DATETIME: "2026-05-25 14:30:00",
    }
  }
};

// Initial Default Layout for New Labels
const DEFAULT_NEW_LAYOUT: Omit<StickerLayout, 'id'> = {
  name: "新建标签",
  targetEntity: "delivery",
  width: 100,
  height: 60,
  unit: "mm",
  backgroundColor: "#ffffff",
  elements: [],
  templateType: "label",
};

type MainView = 'home' | 'docs' | 'labels' | 'employees' | 'machines' | 'storage' | 'users' | 'logs';
type SubView = 'list' | 'designer';

function scaleElementsToFit(
  elements: StickerElement[],
  excelWidth: number,
  excelHeight: number,
  targetWidth: number,
  targetHeight: number,
): StickerElement[] {
  const PAD = 2;
  const effW = targetWidth - PAD * 2;
  const effH = targetHeight - PAD * 2;
  const scale = Math.min(effW / excelWidth, effH / excelHeight);
  const offsetX = (targetWidth - excelWidth * scale) / 2;
  return elements.map(el => ({
    ...el,
    x: el.x * scale + offsetX,
    y: el.y * scale + PAD,
    w: el.w * scale,
    h: el.h * scale,
    style: el.style ? {
      ...el.style,
      fontSize: el.style.fontSize ? Math.max(8, Math.round(el.style.fontSize * scale)) : undefined,
      borderWidth: el.style.borderWidth ? Math.max(0.5, +(el.style.borderWidth * scale).toFixed(1)) : undefined,
    } : undefined,
  }));
}

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const designerRef = useRef<QRLayoutDesigner | null>(null);

  const [user, setUser] = useState<UserInfo | null>(() => {
    try {
      const raw = sessionStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  const [mainView, setMainView] = useState<MainView>('employees');
  const [subView, setSubView] = useState<SubView>('list');
  const [labels, setLabels] = useState<StickerLayout[]>([]);
  const [labelsTotal, setLabelsTotal] = useState(0);
  const [labelsPage, setLabelsPage] = useState(1);
  const labelsPageSize = 20;
  const [labelsSearch, setLabelsSearch] = useState('');
  const [labelsType, setLabelsType] = useState('');
  const [editingLayout, setEditingLayout] = useState<StickerLayout | null>(null);
  const [newTemplateType, setNewTemplateType] = useState<'label' | 'report' | 'cover'>('label');

  const canDesign = user && (user.role === 'admin' || user.role === 'designer');
  const canManage = user?.role === 'admin';

  const handleLogin = (u: UserInfo) => setUser(u);
  const handleLogout = () => {
    sessionStorage.removeItem('user');
    setUser(null);
    setMainView('employees');
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportExcel = () => {
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

  // 带搜索+类型筛选的分页
  const fetchLabelsPage = async (page: number, search?: string, type?: string) => {
    const q = search !== undefined ? search : labelsSearch;
    const t = type !== undefined ? type : labelsType;
    try {
      const res = await storage.getLabels(page, labelsPageSize, '', q, t);
      setLabels(res.data);
      setLabelsTotal(res.total || 0);
      setLabelsPage(res.page);
    } catch {}
  };
  const handleLabelsSearch = (q: string) => {
    setLabelsSearch(q);
    fetchLabelsPage(1, q);
  };
  const handleLabelsType = (t: string) => {
    setLabelsType(t);
    fetchLabelsPage(1, undefined, t);
  };
  const lastFetchRef = useRef(Date.now());

  // Load data on mount
  useEffect(() => {
    (async () => {
      await storage.initializeDefaults();
      lastFetchRef.current = Date.now();
      await fetchLabelsPage(1);
    })();
  }, []);

  // 多人协作：增量轮询（仅拉取最近变更，<1KB）
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const since = new Date(lastFetchRef.current - 60_000).toISOString(); // 多拉1分钟防漏
        const delta = await storage.getLabelsDelta(since);
        if (delta.data.length > 0 || delta.deleted.length > 0) {
          lastFetchRef.current = Date.now();
          // 有变更/删除 → 静默刷新当前页
          const res = await storage.getLabels(labelsPage, labelsPageSize, '', labelsSearch, labelsType);
          if (res && res.data) { setLabels(res.data); setLabelsTotal(res.total || 0); }
        }
      } catch {}
    }, 30_000);
    return () => clearInterval(timer);
  }, [labelsPage]);

  // Initialize Designer when switching to designer view
  useEffect(() => {
    if (subView !== 'designer' || !containerRef.current) return;

    // Clear old designer DOM
    containerRef.current.innerHTML = '';

    const initialLayout = editingLayout
      ? JSON.parse(JSON.stringify(editingLayout))  // 深拷贝，避免互相影响
      : {
          ...DEFAULT_NEW_LAYOUT,
          id: crypto.randomUUID(),
          templateType: newTemplateType,
          name: newTemplateType === 'report' ? '新建出货报告' : '新建标签',
          width: newTemplateType === 'report' ? 210 : DEFAULT_NEW_LAYOUT.width,
          height: newTemplateType === 'report' ? 297 : DEFAULT_NEW_LAYOUT.height,
          unit: newTemplateType === 'report' ? 'mm' : DEFAULT_NEW_LAYOUT.unit,
        };

    const originalName = editingLayout?.name ?? '';

    designerRef.current = new QRLayoutDesigner({
      element: containerRef.current,
      entitySchemas: SAMPLE_SCHEMAS,
      initialLayout: initialLayout as StickerLayout,
      onSave: async (layout) => {
        // 编辑模式且改了名称 → 生成新模板，保留旧模板
        if (originalName && layout.name !== originalName) {
          layout.id = crypto.randomUUID();
        }
        // 后端检查同名冲突
        let result = await storage.addLabel(layout);
        if (result.conflict) {
          const ok = confirm(`模板名称「${layout.name}」已存在，是否覆盖？\n\n覆盖将删除旧模板，新模板将保留。`);
          if (!ok) return;
          result = await storage.addLabel(layout, true); // overwrite=1
        }
        if (!result.ok) return;
        // 刷新第一页（新保存的模板排在最前）
        await fetchLabelsPage(1);
        setSubView('list');
        setEditingLayout(null);
      }
    });

    return () => {
      if (designerRef.current) {
        designerRef.current.destroy();
        designerRef.current = null;
      }
    };
  }, [subView, editingLayout, newTemplateType]);

  const handleCreateNew = (type?: 'label' | 'report' | 'cover') => {
    setNewTemplateType(type || 'label');
    setEditingLayout(null);
    setSubView('designer');
  };

  const handleEdit = async (layout: StickerLayout) => {
    // 从详情接口加载完整数据（含 elements）
    const full = await storage.getLabel(layout.id);
    if (full) {
      setEditingLayout(full);
      setSubView('designer');
    }
  };

  const handleDelete = async (id: string) => {
    await storage.deleteLabel(id);
    // 刷新当前页（删除后可能本页少一条，正好补下一条）
    await fetchLabelsPage(labelsPage);
  };

  const handleBackToList = () => {
    setSubView('list');
    setEditingLayout(null);
  };

  const handleMainViewChange = (view: MainView) => {
    setMainView(view);
    setSubView('list'); // Reset subview when switching main tabs
  };

  // Not logged in → show login page
  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <input type="file" ref={fileInputRef} accept=".xlsx,.xls"
        onChange={handleFileChange} style={{ display: 'none' }} />

      {/* If acting as Designer, cover full screen (or manage as modal) */}
      {subView === 'designer' ? (
        <div className="relative">
          <div className="fixed top-4 left-4 z-[9999] flex gap-2">
            <button onClick={handleBackToList}
              className="flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium shadow-md transition-all border border-gray-200 cursor-pointer">
              <ArrowLeft size={18} /> 返回标签列表
            </button>
            <button onClick={handleImportExcel}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium shadow-md transition-all cursor-pointer"
              title="上传 Excel，自动缩放适配当前标签尺寸">
              <FileUp size={18} /> 导入Excel
            </button>
          </div>
          <div
            className="designer-container"
            ref={containerRef}
          />
        </div>
      ) : (
        <>
          {/* Navigation Bar */}
          <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40 backdrop-blur-lg bg-white/95">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col lg:flex-row items-center justify-between py-4 gap-4">
                {/* Logo/Brand and Mobile Actions */}
                <div className="flex items-center justify-between w-full lg:w-auto gap-3">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0">
                      <img src="/公司LOGO.png" alt="地博" className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg shadow-md object-contain bg-white" />
                    </div>
                    <div>
                      <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent truncate max-w-[150px] sm:max-w-full">
                        客户出货自助系统
                      </h1>
                      {/* 已移除：作者 @shashi089
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">作者</p>
                        <a
                          href="https://github.com/shashi089"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] sm:text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          @shashi089
                        </a>
                      </div>
                      */}
                    </div>
                  </div>

                  {/* Mobile User Info */}
                  <div className="lg:hidden flex items-center gap-2">
                    <span className="text-xs text-gray-400">{user.display_name}</span>
                    <button onClick={handleLogout}
                      className="text-xs text-gray-500 hover:text-red-600 font-medium px-2 py-1.5 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                      退出
                    </button>
                  </div>
                </div>

                {/* Navigation Tabs - Scrollable on mobile */}
                <div className="w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
                  <nav className="flex gap-1.5 sm:gap-2 bg-gray-100 p-1 sm:p-1.5 rounded-xl w-max mx-auto lg:mx-0">
                    {/* 已移除：首页按钮 */}
                    {/* 已移除：文档按钮
                    <button
                      onClick={() => handleMainViewChange('docs')}
                      className={`flex items-center gap-2 px-4 py-2 font-semibold transition-all duration-200 rounded-lg cursor-pointer ${mainView === 'docs'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                        }`}
                    >
                      <BookOpen size={18} />
                      <span className="hidden sm:inline">文档</span>
                    </button>
                    */}
                    {canDesign && (
                      <button
                        onClick={() => handleMainViewChange('labels')}
                        className={`flex items-center gap-2 px-4 py-2 font-semibold transition-all duration-200 rounded-lg cursor-pointer ${mainView === 'labels'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                          }`}
                      >
                        <Tag size={18} />
                        <span>标签</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleMainViewChange('employees')}
                      className={`flex items-center gap-2 px-5 py-2.5 font-semibold transition-all duration-200 rounded-lg cursor-pointer ${mainView === 'employees'
                        ? 'bg-white text-blue-600 shadow-md'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                        }`}
                    >
                      <Truck size={18} />
                      <span>出货数据</span>
                    </button>
                    {canManage && (
                      <button
                        onClick={() => handleMainViewChange('users' as any)}
                        className={`flex items-center gap-2 px-4 py-2 font-semibold transition-all duration-200 rounded-lg cursor-pointer ${mainView === ('users' as any)
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                          }`}
                      >
                        <Users size={18} />
                        <span className="hidden md:inline">用户</span>
                      </button>
                    )}
                    {canManage && (
                      <button
                        onClick={() => handleMainViewChange('logs' as any)}
                        className={`flex items-center gap-2 px-4 py-2 font-semibold transition-all duration-200 rounded-lg cursor-pointer ${mainView === ('logs' as any)
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                          }`}
                      >
                        <History size={18} />
                        <span className="hidden md:inline">日志</span>
                      </button>
                    )}
                    {/* 已移除：设备按钮
                    <button
                      onClick={() => handleMainViewChange('machines')}
                      className={`flex items-center gap-2 px-4 py-2 font-semibold transition-all duration-200 rounded-lg cursor-pointer ${mainView === 'machines'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                        }`}
                    >
                      <Cpu size={18} />
                      <span className="hidden md:inline">设备</span>
                    </button>
                    */}
                    {/* 已移除：库位按钮
                    <button
                      onClick={() => handleMainViewChange('storage')}
                      className={`flex items-center gap-2 px-4 py-2 font-semibold transition-all duration-200 rounded-lg cursor-pointer ${mainView === 'storage'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                        }`}
                    >
                      <Package size={18} />
                      <span className="hidden sm:inline">库位</span>
                    </button>
                    */}

                  </nav>
                </div>

                {/* Desktop Actions */}
                <div className="hidden lg:flex items-center gap-3">
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">{user.display_name}</span>
                  <button onClick={handleLogout}
                    className="text-sm text-gray-500 hover:text-red-600 font-medium px-3 py-1.5 hover:bg-red-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1">
                    <LogOut size={14} /> 退出
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content Based on Tab */}
          {mainView === 'home' ? (
            <EmployeeMaster />
          ) : mainView === 'labels' ? (
            <LabelList
              labels={labels}
              total={labelsTotal}
              page={labelsPage}
              pageSize={labelsPageSize}
              searchQuery={labelsSearch}
              typeFilter={labelsType}
              onSearchChange={handleLabelsSearch}
              onTypeChange={handleLabelsType}
              onPageChange={fetchLabelsPage}
              onCreateNew={handleCreateNew}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ) : mainView === 'employees' ? (
            <EmployeeMaster />
          ) : mainView === 'users' ? (
            <UserManagePage />
          ) : mainView === 'logs' ? (
            <TemplateLogPage />
          ) : null}
        </>
      )}
    </div>
  )
}

export default App
