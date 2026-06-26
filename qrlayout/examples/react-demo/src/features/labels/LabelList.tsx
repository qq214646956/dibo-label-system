import React, { useState, useMemo } from 'react';
import type { StickerLayout } from 'qrlayout-ui';
import { Plus, Layout, Smartphone, Search, X, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Table, type Column } from '../../components/Table';

interface LabelListProps {
    labels: StickerLayout[];
    total: number;
    page: number;
    pageSize: number;
    searchQuery: string;
    typeFilter: string;
    onSearchChange: (q: string) => void;
    onTypeChange: (t: string) => void;
    onPageChange: (page: number) => void;
    onCreateNew: (type?: 'label' | 'report' | 'cover') => void;
    onEdit: (label: StickerLayout) => void;
    onDelete: (id: string) => void;
}

const TYPE_OPTIONS = [
    { value: '', label: '全部' },
    { value: 'label', label: '标签' },
    { value: 'report', label: '出货报告' },
    { value: 'cover', label: '封面标签' },
];

export const LabelList: React.FC<LabelListProps> = ({
    labels, total, page, pageSize, searchQuery, typeFilter, onSearchChange, onTypeChange, onPageChange,
    onCreateNew, onEdit, onDelete,
}) => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const [localQuery, setLocalQuery] = useState(searchQuery);

    // 输入防抖：300ms 后触发服务端搜索
    const timerRef = React.useRef<ReturnType<typeof setTimeout>>();
    const handleQueryChange = (q: string) => {
        setLocalQuery(q);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => onSearchChange(q), 300);
    };

    const handleDelete = (label: StickerLayout) => {
        if (confirm(`确定要删除 "${label.name}" 吗？`)) {
            onDelete(label.id);
        }
    };

    const columns: Column<StickerLayout>[] = [
        {
            header: '模板名称',
            accessorKey: 'name',
            render: (_val, item) => {
                const tt = (item as any).templateType || 'label';
                const isCover = tt === 'cover';
                const isReport = tt === 'report';
                const colors = isCover ? 'bg-purple-100 text-purple-600' : isReport ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600';
                const badge = isCover ? 'bg-purple-50 text-purple-700' : isReport ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700';
                const label = isCover ? '封面标签' : isReport ? '出货报告' : '标签';
                const Icon = isCover ? Layout : isReport ? FileText : Layout;
                return (
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors}`}>
                            <Icon size={20} />
                        </div>
                        <div>
                            <div className="font-semibold text-gray-900">{item.name}</div>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${badge}`}>{label}</span>
                        </div>
                    </div>
                );
            }
        },
        {
            header: '目标实体',
            accessorKey: 'targetEntity',
            render: (val: string) => (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize border border-gray-200">
                    <Smartphone size={12} />
                    {val || "无"}
                </span>
            )
        },
        {
            header: '尺寸',
            accessorKey: 'width',
            render: (_val, item) => (
                <span className="text-gray-600 text-sm font-mono">
                    {item.width}{item.unit} × {item.height}{item.unit}
                </span>
            )
        },
        {
            header: '元素',
            accessorKey: 'elementCount',
            render: (val: number) => (
                <span className="bg-gray-50 px-2 py-1 rounded border border-gray-100 text-sm text-gray-600">
                    {val || 0} 个元素
                </span>
            )
        }
    ];

    return (
        <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">标签与报告模版</h1>
                    <p className="text-gray-500 mt-1">设计你的专属标签与报告</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onCreateNew('label')}
                        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-medium transition-all shadow-sm hover:shadow-md active:scale-95 cursor-pointer"
                    >
                        <Plus size={20} />
                        <span>新建标签</span>
                    </button>
                    <button
                        onClick={() => onCreateNew('report')}
                        className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl font-medium transition-all shadow-sm hover:shadow-md active:scale-95 cursor-pointer"
                    >
                        <Plus size={20} />
                        <span>新建报告</span>
                    </button>
                    <button
                        onClick={() => onCreateNew('cover')}
                        className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-xl font-medium transition-all shadow-sm hover:shadow-md active:scale-95 cursor-pointer"
                    >
                        <Plus size={20} />
                        <span>新建封面</span>
                    </button>
                </div>
            </div>

            {/* Search Bar + Filter */}
            <div className="mb-6 flex flex-wrap items-center gap-3">
                <div className="relative max-w-md flex-1 min-w-[200px]">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        className="w-full pl-9 pr-8 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder="搜索模版名称..."
                        value={localQuery}
                        onChange={e => handleQueryChange(e.target.value)}
                    />
                    {localQuery && (
                        <button onClick={() => { setLocalQuery(''); onSearchChange(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded cursor-pointer">
                            <X size={14} className="text-gray-400" />
                        </button>
                    )}
                </div>
                <select
                    className="px-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={typeFilter}
                    onChange={e => onTypeChange(e.target.value)}
                >
                    {TYPE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                {(localQuery || typeFilter) && (
                    <p className="text-xs text-gray-400">
                        找到 {total} 个匹配
                    </p>
                )}
            </div>

            {/* Content Table */}
            <Table
                data={labels}
                columns={columns}
                keyField="id"
                onEdit={onEdit}
                onDelete={handleDelete}
            />

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-4">
                    <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
                        className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                        <ChevronLeft size={18} />
                    </button>
                    <span className="text-sm text-gray-600 min-w-[100px] text-center">
                        第 {page} / {totalPages} 页（共 {total} 个模板）
                    </span>
                    <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
                        className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}
        </div>
    );
};
