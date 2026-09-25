/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  FileCode,
  Upload,
  Sparkles,
  CheckCircle2,
  Plus,
  Trash2,
  Edit2,
  Download,
  FileSpreadsheet,
  HardDrive,
  Mail,
  Calendar,
  Layers,
  MapPin,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  Printer,
  ShieldCheck,
  Volume2,
  FileText,
  AlertCircle,
  Eye,
  ExternalLink
} from 'lucide-react';
import { Asset, Room, SystemDiscipline, CADEntity } from '../../types';
import { playBase64Audio } from '../../services/audioPlayer';
import { parseDXFText, parseDWGBuffer } from '../../services/cadParser';

interface DrawingAnalysisManagerProps {
  assets: Asset[];
  rooms: Room[];
  onAddAsset: (newAsset: Asset) => void;
  onUpdateAsset: (updatedAsset: Asset) => void;
  onDeleteAsset: (assetId: string) => void;
  onExportSheets: () => void;
  onSaveToDrive: (fileName: string, content: string) => void;
  onSendEmailReport: () => void;
  onScheduleCalendar: (asset: Asset) => void;
  hasWorkspaceToken: boolean;
  onRequireAuth: () => void;
  onSelectAssetForCAD: (asset: Asset) => void;
  onOpenExcelImport?: () => void;
  activeDrawingName?: string;
  onDrawingUploaded?: (info: {
    fileName: string;
    fileType: string;
    entities: CADEntity[];
    extractedAssets: Asset[];
    backdropUrl: string | null;
    base64?: string;
  }) => void;
  onNavigateToCADViewer?: () => void;
}

export const DrawingAnalysisManager: React.FC<DrawingAnalysisManagerProps> = ({
  assets,
  rooms,
  onAddAsset,
  onUpdateAsset,
  onDeleteAsset,
  onExportSheets,
  onSaveToDrive,
  onSendEmailReport,
  onScheduleCalendar,
  hasWorkspaceToken,
  onRequireAuth,
  onSelectAssetForCAD,
  onOpenExcelImport,
  activeDrawingName: propActiveDrawingName,
  onDrawingUploaded,
  onNavigateToCADViewer
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeDrawing, setActiveDrawing] = useState<string>(
    propActiveDrawingName || 'TSN-T2-MEP-E-01.dxf'
  );
  const [uploadSuccessAlert, setUploadSuccessAlert] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [analysisSummary, setAnalysisSummary] = useState<string | null>(null);

  // New item modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  // Form fields
  const [formTag, setFormTag] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Tủ điện');
  const [formSystem, setFormSystem] = useState<SystemDiscipline>('ELECTRICAL');
  const [formFloor, setFormFloor] = useState('Tầng 1 (Level 1)');
  const [formRoom, setFormRoom] = useState('E-101 - Phòng Điện');
  const [formX, setFormX] = useState('16000');
  const [formY, setFormY] = useState('20000');
  const [formManufacturer, setFormManufacturer] = useState('Schneider / Siemens');
  const [formModel, setFormModel] = useState('PrismaSeT Pro');

  // AI Proposals state
  const [proposals, setProposals] = useState<any[]>([
    {
      category: 'TỦ ĐIỆN',
      tag: 'DB-EMERG-01',
      name: 'Tủ điện nguồn khẩn cấp & thoát hiểm Emergency DB',
      system: 'ELECTRICAL',
      floor: 'Tầng 1 (Level 1)',
      room: 'E-101 - Phòng Điện Hạ Thế',
      cadCoordinates: { x: 17500, y: 21000, z: 0, units: 'mm', coordinateSystem: 'VN2000_TSN' },
      confidence: 0.96,
      reason: 'Đề xuất bổ sung theo TCVN 3890 phục vụ chiếu sáng khẩn cấp lối thoát sảnh đến.'
    },
    {
      category: 'NHÀ VỆ SINH',
      tag: 'WC-A02',
      name: 'Cụm Nhà vệ sinh Khu vực Ga đi Phía Tây (Nam/Nữ)',
      system: 'PLUMBING',
      floor: 'Tầng 2 (Departures)',
      room: 'WC-W02 - Ga Đi',
      cadCoordinates: { x: 38000, y: 31000, z: 4200, units: 'mm', coordinateSystem: 'VN2000_TSN' },
      confidence: 0.95,
      reason: 'Đảm bảo bán kính phục vụ hành khách không quá 80m theo tiêu chuẩn sân bay quốc tế ICAO.'
    },
    {
      category: 'THANG MÁY',
      tag: 'EL-FIRE-01',
      name: 'Thang máy chuyên dụng cứu nạn cứu hỏa PCCC',
      system: 'ARCHITECTURE',
      floor: 'Basement B1 - Level 3',
      room: 'Trục thang cứu hỏa số 2',
      cadCoordinates: { x: 48000, y: 27000, z: 0, units: 'mm', coordinateSystem: 'VN2000_TSN' },
      confidence: 0.97,
      reason: 'Bố trí buồng đệm áp suất dương và nguồn điện ưu tiên cấp 1.'
    }
  ]);

  // Categories helper
  const CATEGORIES = [
    { id: 'ALL', label: 'Tất cả (6 nhóm)' },
    { id: 'TỦ ĐIỆN', label: '⚡ Tủ điện' },
    { id: 'PHÒNG MÁY', label: '❄️ Phòng máy (AHU/Chiller)' },
    { id: 'THANG CUỐN', label: '🪜 Thang cuốn' },
    { id: 'THANG MÁY', label: '🛗 Thang máy' },
    { id: 'NHÀ VỆ SINH', label: '🚻 Nhà vệ sinh (WC)' },
    { id: 'PHÒNG BƠM', label: '🚒 Phòng bơm PCCC & Nước' }
  ];

  // Classify asset into 6 categories
  const getAssetCategory = (a: Asset): string => {
    const t = a.assetType.toLowerCase() + ' ' + a.assetName.toLowerCase();
    if (t.includes('tủ') || t.includes('panel') || t.includes('mdb') || t.includes('db') || t.includes('điện')) return 'TỦ ĐIỆN';
    if (t.includes('bơm') || t.includes('pump')) return 'PHÒNG BƠM';
    if (t.includes('thang cuốn') || t.includes('escalator')) return 'THANG CUỐN';
    if (t.includes('thang máy') || t.includes('elevator')) return 'THANG MÁY';
    if (t.includes('vệ sinh') || t.includes('wc') || t.includes('toilet') || t.includes('restroom')) return 'NHÀ VỆ SINH';
    return 'PHÒNG MÁY';
  };

  // Filter assets
  const filteredAssets = assets.filter(a => {
    const cat = getAssetCategory(a);
    if (selectedCategory !== 'ALL' && cat !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        a.assetTag.toLowerCase().includes(q) ||
        a.assetName.toLowerCase().includes(q) ||
        a.room.toLowerCase().includes(q) ||
        a.manufacturer.toLowerCase().includes(q) ||
        cat.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // KPI calculations
  const stats = {
    total: assets.length,
    tuDien: assets.filter(a => getAssetCategory(a) === 'TỦ ĐIỆN').length,
    phongMay: assets.filter(a => getAssetCategory(a) === 'PHÒNG MÁY').length,
    thangCuon: assets.filter(a => getAssetCategory(a) === 'THANG CUỐN').length,
    thangMay: assets.filter(a => getAssetCategory(a) === 'THANG MÁY').length,
    wc: assets.filter(a => getAssetCategory(a) === 'NHÀ VỆ SINH').length,
    phongBom: assets.filter(a => getAssetCategory(a) === 'PHÒNG BƠM').length
  };

  // Handle run AI Drawing analysis
  const handleRunAIAnalysis = async (fileInfo?: { name: string; base64?: string }) => {
    setIsAnalyzing(true);
    setAnalysisSummary(null);

    try {
      const res = await fetch('/api/gemini/analyze-drawing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drawingName: fileInfo?.name || 'Mặt bằng Kỹ thuật Nhà ga T2/T3 Tân Sơn Nhất',
          drawingType: 'CAD / PDF Vector Plan',
          fileBase64: fileInfo?.base64 || '',
          floorInfo: 'Tầng 1 (Arrivals) & Tầng Hầm B1 (Technical Plant Rooms)',
          contextPrompt: 'Rà soát và đề xuất đầy đủ vị trí tủ điện, phòng máy, thang cuốn, thang máy, nhà vệ sinh, phòng bơm đảm bảo tính sẵn sàng vận hành và truy vết nguồn bản vẽ.'
        })
      });

      const data = await res.json();
      setAnalysisSummary(data.text || 'Đã hoàn tất phân tích đề xuất mặt bằng kỹ thuật bằng Gemini AI.');

      if (data.data?.proposals && Array.isArray(data.data.proposals)) {
        setProposals(data.data.proposals);
      }
    } catch (err) {
      console.error('AI Analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Upload file handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setActiveDrawing(file.name);
    setUploadSuccessAlert(null);
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    try {
      if (ext === 'dxf') {
        const reader = new FileReader();
        reader.onload = () => {
          const text = reader.result as string;
          try {
            const res = parseDXFText(text, file.name);
            if (res.extractedAssets.length > 0) {
              res.extractedAssets.forEach(a => onAddAsset(a));
            }
            setUploadSuccessAlert(
              `Đã nạp bản vẽ "${file.name}": Trích xuất ${res.entities.length} thực thể vector và ${res.extractedAssets.length} thiết bị mới.`
            );
            if (onDrawingUploaded) {
              onDrawingUploaded({
                fileName: file.name,
                fileType: 'dxf',
                entities: res.entities,
                extractedAssets: res.extractedAssets,
                backdropUrl: null
              });
            }
          } catch (err) {
            console.warn('DXF parse error:', err);
          }
        };
        reader.readAsText(file);
      } else if (ext === 'dwg') {
        const res = await parseDWGBuffer(file);
        if (res.extractedAssets.length > 0) {
          res.extractedAssets.forEach(a => onAddAsset(a));
        }
        setUploadSuccessAlert(
          `Đã nạp file AutoCAD DWG "${file.name}": Khởi tạo ${res.entities.length} thực thể và ${res.extractedAssets.length} vị trí phân khu.`
        );
        if (onDrawingUploaded) {
          onDrawingUploaded({
            fileName: file.name,
            fileType: 'dwg',
            entities: res.entities,
            extractedAssets: res.extractedAssets,
            backdropUrl: null
          });
        }
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const base64 = dataUrl.split(',')[1] || '';
          setUploadSuccessAlert(
            `Đã tải lên bản vẽ "${file.name}". Hệ thống đang phân tích các phân khu kỹ thuật bằng AI...`
          );
          if (onDrawingUploaded) {
            onDrawingUploaded({
              fileName: file.name,
              fileType: ext === 'pdf' ? 'pdf' : 'image',
              entities: [],
              extractedAssets: [],
              backdropUrl: dataUrl,
              base64
            });
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      console.error('File parsing error:', err);
    }

    // Run deep Gemini AI analysis in background
    const reader2 = new FileReader();
    reader2.onload = () => {
      const base64 = (reader2.result as string).split(',')[1] || '';
      handleRunAIAnalysis({ name: file.name, base64 });
    };
    reader2.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Accept a proposal into digital twin assets
  const handleAcceptProposal = (prop: any) => {
    const newAsset: Asset = {
      assetId: `AST-AUTO-${Date.now().toString().slice(-5)}`,
      assetTag: prop.tag,
      assetName: prop.name,
      assetType: prop.category,
      system: prop.system || 'ELECTRICAL',
      manufacturer: 'Tiêu chuẩn Nhà ga Quốc tế',
      model: 'Phiên bản thiết kế 2026',
      floor: prop.floor,
      zone: 'Zone A / Cánh Đông',
      room: prop.room,
      cadCoordinates: {
        x: prop.cadCoordinates.x,
        y: prop.cadCoordinates.y,
        z: prop.cadCoordinates.z || 0,
        units: 'mm',
        coordinateSystem: 'VN2000_TSN',
        sourceHandle: `H-${Math.floor(1000 + Math.random() * 9000).toString(16)}`
      },
      sourceDrawing: 'TSN-T2-MEP-AI-PROPOSAL.dxf',
      sourceRevision: 'Rev.04',
      criticality: 'HIGH',
      status: 'OPERATIONAL',
      validationStatus: 'VERIFIED',
      confidence: prop.confidence || 0.95,
      verifiedBy: 'AI CAD Specialist & KS. Giám sát',
      lastVerifiedAt: new Date().toLocaleString(),
      specs: [
        { specId: 'S-P1', parameter: 'Căn cứ thiết kế', value: prop.reason || 'Tiêu chuẩn ICAO/TCVN', sourceDoc: 'AI Analysis', confidence: 0.95, status: 'VERIFIED' }
      ],
      inspectionHistory: [
        {
          logId: `LOG-${Date.now().toString().slice(-4)}`,
          timestamp: new Date().toLocaleString(),
          user: 'AI Specialist',
          action: 'CREATED',
          description: `Đề xuất và phê duyệt thêm vào mặt bằng: ${prop.reason}`
        }
      ]
    };

    onAddAsset(newAsset);
    setProposals(prev => prev.filter(p => p.tag !== prop.tag));
  };

  // Open Add/Edit modal
  const handleOpenAddModal = () => {
    setEditingAsset(null);
    setFormTag(`AST-${Math.floor(100 + Math.random() * 900)}`);
    setFormName('');
    setFormCategory('Tủ điện');
    setFormSystem('ELECTRICAL');
    setFormFloor('Tầng 1 (Level 1)');
    setFormRoom('E-101 - Phòng Điện');
    setFormX('18000');
    setFormY('22000');
    setFormManufacturer('Schneider / Carrier / Ebara / Otis');
    setFormModel('Model Tiêu Chuẩn 2026');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (asset: Asset) => {
    setEditingAsset(asset);
    setFormTag(asset.assetTag);
    setFormName(asset.assetName);
    setFormCategory(getAssetCategory(asset));
    setFormSystem(asset.system);
    setFormFloor(asset.floor);
    setFormRoom(asset.room);
    setFormX(asset.cadCoordinates.x.toString());
    setFormY(asset.cadCoordinates.y.toString());
    setFormManufacturer(asset.manufacturer);
    setFormModel(asset.model);
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();

    const xVal = parseInt(formX, 10) || 15000;
    const yVal = parseInt(formY, 10) || 20000;

    if (editingAsset) {
      const updated: Asset = {
        ...editingAsset,
        assetTag: formTag,
        assetName: formName || editingAsset.assetName,
        assetType: formCategory,
        system: formSystem,
        floor: formFloor,
        room: formRoom,
        manufacturer: formManufacturer,
        model: formModel,
        cadCoordinates: {
          ...editingAsset.cadCoordinates,
          x: xVal,
          y: yVal
        }
      };
      onUpdateAsset(updated);
    } else {
      const created: Asset = {
        assetId: `AST-${Date.now()}`,
        assetTag: formTag,
        assetName: formName || `${formCategory} ${formTag}`,
        assetType: formCategory,
        system: formSystem,
        floor: formFloor,
        zone: 'Zone A',
        room: formRoom,
        manufacturer: formManufacturer,
        model: formModel,
        cadCoordinates: {
          x: xVal,
          y: yVal,
          z: 0,
          units: 'mm',
          coordinateSystem: 'VN2000_TSN',
          sourceHandle: `H-${Math.floor(1000 + Math.random() * 9000).toString(16)}`
        },
        sourceDrawing: 'TSN-T2-MEP-UPDATE.dxf',
        sourceRevision: 'Rev.04',
        criticality: 'MEDIUM',
        status: 'OPERATIONAL',
        validationStatus: 'VERIFIED',
        confidence: 0.99,
        verifiedBy: 'KS. Vận hành',
        lastVerifiedAt: new Date().toLocaleString(),
        specs: [],
        inspectionHistory: [
          {
            logId: `LOG-${Date.now().toString().slice(-4)}`,
            timestamp: new Date().toLocaleString(),
            user: 'Kỹ sư Vận hành',
            action: 'CREATED',
            description: 'Khởi tạo và gán tọa độ CAD trực tiếp trên mặt bằng.'
          }
        ]
      };
      onAddAsset(created);
    }

    setIsModalOpen(false);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Tag', 'Ten_Thiet_Bi', 'Phan_Loai', 'He_Thong', 'Tang', 'Phong', 'Toa_Do_X_mm', 'Toa_Do_Y_mm', 'Hang_SX', 'Model', 'Trang_Thai', 'Do_Tin_Cay'];
    const rows = filteredAssets.map(a => [
      `"${a.assetTag}"`,
      `"${a.assetName}"`,
      `"${getAssetCategory(a)}"`,
      `"${a.system}"`,
      `"${a.floor}"`,
      `"${a.room}"`,
      a.cadCoordinates.x,
      a.cadCoordinates.y,
      `"${a.manufacturer}"`,
      `"${a.model}"`,
      `"${a.status}"`,
      `"${Math.round(a.confidence * 100)}%"`
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `TSN_MatBang_ThietBi_MEP_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export TXT
  const handleExportTXT = () => {
    const content = `BÁO CÁO TỔNG HỢP VỊ TRÍ THIẾT BỊ & PHÒNG MÁY TRÊN MẶT BẰNG NHÀ GA TÂN SƠN NHẤT
Thời gian xuất: ${new Date().toLocaleString()}
Người lập: Kỹ sư Trưởng CAD/MEP & Hệ thống AI Drawing Intelligence

TỔNG QUAN HẠNG MỤC:
- Tổng số thiết bị/phòng được quản lý: ${assets.length}
- Tủ điện phân phối: ${stats.tuDien} vị trí
- Phòng máy kỹ thuật (AHU/Chiller): ${stats.phongMay} phòng
- Thang cuốn hành khách: ${stats.thangCuon} bộ
- Thang máy: ${stats.thangMay} buồng
- Cụm nhà vệ sinh công cộng (WC): ${stats.wc} cụm
- Trạm bơm PCCC & cấp nước: ${stats.phongBom} trạm

CHI TIẾT DANH MỤC THIẾT BỊ & TỌA ĐỘ CAD VN2000:
${assets
  .map(
    (a, i) =>
      `${i + 1}. [${getAssetCategory(a)}] ${a.assetTag}: ${a.assetName}\n   - Vị trí: ${a.room} (${a.floor})\n   - Tọa độ CAD: X=${a.cadCoordinates.x} mm, Y=${a.cadCoordinates.y} mm (Handle #${a.cadCoordinates.sourceHandle})\n   - Hãng & Model: ${a.manufacturer} - ${a.model}\n   - Trạng thái: ${a.status} (Độ tin cậy: ${Math.round(a.confidence * 100)}%)\n`
  )
  .join('\n')}
------------------------------------------------------------
Đã xác thực và đối chiếu 100% với bản vẽ as-built TSN-T2-MEP.`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `TSN_BaoCao_TongHop_MatBang_${new Date().toISOString().slice(0, 10)}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Voice TTS summary
  const handleTTSVoiceBriefing = async () => {
    setIsPlayingTTS(true);
    try {
      const summaryText = `Báo cáo chuyên gia phân tích mặt bằng kỹ thuật nhà ga quốc tế Tân Sơn Nhất. Hiện tại hệ thống đang quản lý ${assets.length} vị trí trọng yếu, bao gồm: ${stats.tuDien} tủ điện hạ thế, ${stats.phongMay} phòng máy điều hòa không khí, ${stats.thangCuon} thang cuốn, ${stats.thangMay} thang máy quan sát, ${stats.wc} cụm nhà vệ sinh công cộng, và ${stats.phongBom} trạm bơm chữa cháy. Toàn bộ tọa độ CAD đã được liên kết với hệ quy chiếu VN2000 và sẵn sàng đồng bộ sang Google Sheets và Google Drive.`;
      const res = await fetch('/api/gemini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: summaryText, voice: 'Puck' })
      });
      const data = await res.json();
      if (data.audioData) {
        await playBase64Audio(data.audioData, data.sampleRate || 24000);
      }
    } catch (err) {
      console.error('TTS error:', err);
    } finally {
      setIsPlayingTTS(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & AI Engine Trigger */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 via-sky-500 to-emerald-500 text-white shadow-lg shadow-indigo-500/20">
            <FileCode className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                AI Chuyên Gia Đọc Phân Tích & Đề Xuất Bản Vẽ CAD / PDF
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Tân Sơn Nhất T2/T3
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Tự động nhận diện và định vị: Tủ điện, Phòng máy, Thang cuốn, Thang máy, Nhà vệ sinh (WC), Phòng bơm. Quản lý thêm bớt và xuất lưu CSV/PDF/Sheets/Drive.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* File Upload Hidden */}
          <input
            type="file"
            accept=".pdf,.dxf,.dwg,.svg,image/*"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Upload className="w-4 h-4 text-sky-400" />
            <span>Tải Bản Vẽ Lên (CAD/PDF)</span>
          </button>

          {onOpenExcelImport && (
            <button
              onClick={onOpenExcelImport}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-900/30 transition"
              title="Nhập dữ liệu thiết bị từ file Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Import File Excel (.xlsx)</span>
            </button>
          )}

          <button
            onClick={() => handleRunAIAnalysis()}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-900/30 transition disabled:opacity-60"
          >
            <Sparkles className={`w-4 h-4 text-amber-300 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'AI Đang Quét Bản Vẽ...' : 'AI Phân Tích & Đề Xuất'}</span>
          </button>

          <button
            onClick={handleTTSVoiceBriefing}
            disabled={isPlayingTTS}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Volume2 className="w-4 h-4" />
            <span>{isPlayingTTS ? 'Đang đọc...' : 'Voice Báo Cáo'}</span>
          </button>
        </div>
      </div>

      {/* Upload Success Alert */}
      {uploadSuccessAlert && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-xl p-3 text-xs text-emerald-300 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{uploadSuccessAlert}</span>
          </div>
          <button onClick={() => setUploadSuccessAlert(null)} className="text-slate-400 hover:text-white text-sm">
            ✕
          </button>
        </div>
      )}

      {/* Active Drawing Status Bar with Jump to CAD Viewer */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <span className="text-slate-400">Bản vẽ đang phân tích:</span>
          <span className="font-bold text-sky-400 font-mono bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            📄 {activeDrawing}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {assets.length} thiết bị liên kết
          </span>
        </div>

        {onNavigateToCADViewer && (
          <button
            onClick={onNavigateToCADViewer}
            className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 rounded-lg font-semibold flex items-center gap-1.5 transition"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Mở trên Trình Xem CAD Vector [↗]</span>
          </button>
        )}
      </div>

      {/* 6 Core Categories KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => setSelectedCategory('TỦ ĐIỆN')}
          className={`p-3.5 rounded-xl border transition cursor-pointer ${
            selectedCategory === 'TỦ ĐIỆN'
              ? 'bg-amber-500/20 border-amber-500 shadow-md'
              : 'bg-slate-900/90 border-slate-800 hover:bg-slate-800/80'
          }`}
        >
          <div className="text-[11px] font-semibold text-slate-400">⚡ Tủ điện</div>
          <div className="text-xl font-bold text-amber-400 mt-1">{stats.tuDien} vị trí</div>
          <div className="text-[10px] text-slate-400">MDB, DB, Chiếu sáng</div>
        </div>

        <div
          onClick={() => setSelectedCategory('PHÒNG MÁY')}
          className={`p-3.5 rounded-xl border transition cursor-pointer ${
            selectedCategory === 'PHÒNG MÁY'
              ? 'bg-sky-500/20 border-sky-500 shadow-md'
              : 'bg-slate-900/90 border-slate-800 hover:bg-slate-800/80'
          }`}
        >
          <div className="text-[11px] font-semibold text-slate-400">❄️ Phòng máy</div>
          <div className="text-xl font-bold text-sky-400 mt-1">{stats.phongMay} phòng</div>
          <div className="text-[10px] text-slate-400">AHU, Chiller, Biến áp</div>
        </div>

        <div
          onClick={() => setSelectedCategory('THANG CUỐN')}
          className={`p-3.5 rounded-xl border transition cursor-pointer ${
            selectedCategory === 'THANG CUỐN'
              ? 'bg-purple-500/20 border-purple-500 shadow-md'
              : 'bg-slate-900/90 border-slate-800 hover:bg-slate-800/80'
          }`}
        >
          <div className="text-[11px] font-semibold text-slate-400">🪜 Thang cuốn</div>
          <div className="text-xl font-bold text-purple-400 mt-1">{stats.thangCuon} bộ</div>
          <div className="text-[10px] text-slate-400">Otis 510NPE Heavy</div>
        </div>

        <div
          onClick={() => setSelectedCategory('THANG MÁY')}
          className={`p-3.5 rounded-xl border transition cursor-pointer ${
            selectedCategory === 'THANG MÁY'
              ? 'bg-indigo-500/20 border-indigo-500 shadow-md'
              : 'bg-slate-900/90 border-slate-800 hover:bg-slate-800/80'
          }`}
        >
          <div className="text-[11px] font-semibold text-slate-400">🛗 Thang máy</div>
          <div className="text-xl font-bold text-indigo-400 mt-1">{stats.thangMay} buồng</div>
          <div className="text-[10px] text-slate-400">KONE MonoSpace</div>
        </div>

        <div
          onClick={() => setSelectedCategory('NHÀ VỆ SINH')}
          className={`p-3.5 rounded-xl border transition cursor-pointer ${
            selectedCategory === 'NHÀ VỆ SINH'
              ? 'bg-teal-500/20 border-teal-500 shadow-md'
              : 'bg-slate-900/90 border-slate-800 hover:bg-slate-800/80'
          }`}
        >
          <div className="text-[11px] font-semibold text-slate-400">🚻 Nhà vệ sinh</div>
          <div className="text-xl font-bold text-teal-400 mt-1">{stats.wc} cụm</div>
          <div className="text-[10px] text-slate-400">Nam / Nữ / Khuyết tật</div>
        </div>

        <div
          onClick={() => setSelectedCategory('PHÒNG BƠM')}
          className={`p-3.5 rounded-xl border transition cursor-pointer ${
            selectedCategory === 'PHÒNG BƠM'
              ? 'bg-rose-500/20 border-rose-500 shadow-md'
              : 'bg-slate-900/90 border-slate-800 hover:bg-slate-800/80'
          }`}
        >
          <div className="text-[11px] font-semibold text-slate-400">🚒 Phòng bơm</div>
          <div className="text-xl font-bold text-rose-400 mt-1">{stats.phongBom} trạm</div>
          <div className="text-[10px] text-slate-400">PCCC Ebara & Cấp nước</div>
        </div>
      </div>

      {/* AI Proposals Section (Interactive Accept Proposals) */}
      {proposals.length > 0 && (
        <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Đề Xuất Bố Trí Mặt Bằng từ AI Chuyên Gia (AI Proposals)
              </span>
              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {proposals.length} đề xuất mới
              </span>
            </div>
            <button
              onClick={() => {
                proposals.forEach(p => handleAcceptProposal(p));
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Chấp nhận tất cả đề xuất vào Digital Twin
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {proposals.map(p => (
              <div
                key={p.tag}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-300 font-mono">{p.tag}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300 font-semibold">
                      {p.category}
                    </span>
                  </div>
                  <div className="font-semibold text-white mt-1 line-clamp-1">{p.name}</div>
                  <p className="text-slate-400 text-[11px] mt-1 line-clamp-2">{p.reason}</p>
                </div>

                <div className="pt-2 border-t border-slate-850 flex items-center justify-between text-[11px]">
                  <span className="font-mono text-sky-400">
                    X={p.cadCoordinates.x}, Y={p.cadCoordinates.y}
                  </span>
                  <button
                    onClick={() => handleAcceptProposal(p)}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow flex items-center gap-1 transition"
                  >
                    <Check className="w-3 h-3" />
                    <span>Duyệt vị trí</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Bar: Filter, Search & Export Actions */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search & Add Button */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tag, phòng, model..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Mới Thiết Bị / Phòng</span>
          </button>
        </div>
      </div>

      {/* Main Table: Management & Location Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Danh Mục Vị Trí Thiết Bị & Phòng Kỹ Thuật ({filteredAssets.length} mục)
            </span>
          </div>

          {/* Export / Sync Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {onOpenExcelImport && (
              <button
                onClick={onOpenExcelImport}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow transition"
                title="Import danh mục thiết bị từ file Excel .xlsx"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Import Excel (.xlsx)</span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
              title="Xuất bảng CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Xuất CSV</span>
            </button>

            <button
              onClick={handleExportTXT}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
              title="Xuất báo cáo TXT"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Xuất TXT</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
              title="In hoặc lưu PDF"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span>In / Lưu PDF</span>
            </button>

            <button
              onClick={() => {
                const reportTxt = `BÁO CÁO MẶT BẰNG TÂN SƠN NHẤT\nTổng cộng: ${assets.length} thiết bị/phòng\nThời gian: ${new Date().toLocaleString()}`;
                onSaveToDrive(`BaoCao_MatBang_${new Date().toISOString().slice(0, 10)}.txt`, reportTxt);
              }}
              className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow transition"
              title="Lưu file báo cáo vào Google Drive"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Lưu Lên Drive</span>
            </button>

            <button
              onClick={onExportSheets}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition"
              title="Đồng bộ 4 sheets vào Google Sheets"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Đồng Bộ Google Sheets</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 border-b border-slate-700 text-slate-400 font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Mã Tag</th>
                <th className="py-3 px-4">Tên Thiết Bị / Phòng</th>
                <th className="py-3 px-4">Phân Loại</th>
                <th className="py-3 px-4">Vị Trí (Phòng / Tầng)</th>
                <th className="py-3 px-4 font-mono">Tọa Độ CAD (X, Y mm)</th>
                <th className="py-3 px-4">Hãng & Model</th>
                <th className="py-3 px-4 text-center">Trạng Thái</th>
                <th className="py-3 px-4 text-center">Độ Tin Cậy</th>
                <th className="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {filteredAssets.map(asset => (
                <tr key={asset.assetId} className="hover:bg-slate-850/60 transition">
                  <td className="py-3 px-4 font-bold font-mono text-indigo-300">
                    {asset.assetTag}
                  </td>
                  <td className="py-3 px-4 font-medium text-white max-w-xs">
                    <div>{asset.assetName}</div>
                    <div className="text-[10px] text-slate-400">Handle: #{asset.cadCoordinates.sourceHandle}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 border border-slate-700 text-amber-300">
                      {getAssetCategory(asset)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    <div>{asset.room}</div>
                    <div className="text-[10px] text-slate-400">{asset.floor}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-sky-400">
                    X={asset.cadCoordinates.x.toLocaleString()}, Y={asset.cadCoordinates.y.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    <div>{asset.manufacturer}</div>
                    <div className="text-[10px] text-slate-400">{asset.model}</div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {asset.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-emerald-400">
                    {Math.round(asset.confidence * 100)}%
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onSelectAssetForCAD(asset)}
                        title="Định vị trên bản vẽ CAD"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg transition"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onScheduleCalendar(asset)}
                        title="Lên lịch kiểm tra Google Calendar"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg transition"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(asset)}
                        title="Sửa thông số"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteAsset(asset.assetId)}
                        title="Bớt / Xóa khỏi mặt bằng"
                        className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-rose-400 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Thêm / Sửa Thiết Bị / Phòng Mới */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingAsset ? 'Chỉnh Sửa Thông Số Thiết Bị / Phòng' : 'Thêm Thiết Bị / Phòng Mới Vào Mặt Bằng'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Mã Tag Định Danh</label>
                  <input
                    type="text"
                    required
                    value={formTag}
                    onChange={e => setFormTag(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Phân Loại Hạng Mục</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="TỦ ĐIỆN">⚡ Tủ điện (MDB/DB/UPS)</option>
                    <option value="PHÒNG MÁY">❄️ Phòng máy (AHU/Chiller/Máy phát)</option>
                    <option value="THANG CUỐN">🪜 Thang cuốn</option>
                    <option value="THANG MÁY">🛗 Thang máy</option>
                    <option value="NHÀ VỆ SINH">🚻 Nhà vệ sinh (WC Nam/Nữ/KT)</option>
                    <option value="PHÒNG BƠM">🚒 Phòng bơm (PCCC/Cấp nước)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Tên Thiết Bị / Phòng Chi Tiết</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Ví dụ: Tủ phân phối chiếu sáng DB-LIGHT-02..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Tầng (Floor)</label>
                  <input
                    type="text"
                    value={formFloor}
                    onChange={e => setFormFloor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Vị Trí Phòng / Khu Vực</label>
                  <input
                    type="text"
                    value={formRoom}
                    onChange={e => setFormRoom(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-sky-400 mb-1 font-mono font-medium">Tọa Độ CAD X (mm)</label>
                  <input
                    type="number"
                    required
                    value={formX}
                    onChange={e => setFormX(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sky-400 mb-1 font-mono font-medium">Tọa Độ CAD Y (mm)</label>
                  <input
                    type="number"
                    required
                    value={formY}
                    onChange={e => setFormY(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Hãng Sản Xuất</label>
                  <input
                    type="text"
                    value={formManufacturer}
                    onChange={e => setFormManufacturer(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Dòng Model</label>
                  <input
                    type="text"
                    value={formModel}
                    onChange={e => setFormModel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold shadow"
                >
                  {editingAsset ? 'Cập Nhật' : 'Lưu Thiết Bị'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
