/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  Crosshair,
  Info,
  Compass,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Search,
  Tag,
  ShieldCheck,
  FileText,
  Upload,
  HardDrive,
  Sparkles,
  MapPin,
  Plus,
  RefreshCw,
  FolderOpen,
  FileSpreadsheet,
  Check,
  ExternalLink
} from 'lucide-react';
import { CADEntity, Room, Asset, SystemDiscipline } from '../../types';
import { findRoomForCADCoordinate } from '../../services/spatialEngine';
import { parseDXFText, parseDWGBuffer } from '../../services/cadParser';

interface CADViewerProps {
  entities: CADEntity[];
  rooms: Room[];
  assets: Asset[];
  onSelectAsset?: (asset: Asset) => void;
  activeRevision: string;
  onAddAssetAtCoord?: (x: number, y: number, roomName?: string) => void;
  onRunAIAnalysisForDrawing?: (name: string, contentBase64?: string) => void;
  onOpenDriveModal?: () => void;
  onOpenExcelImport?: () => void;
  onDrawingUploaded?: (info: {
    fileName: string;
    fileType: string;
    entities: CADEntity[];
    extractedAssets: Asset[];
    backdropUrl: string | null;
    base64?: string;
  }) => void;
  activeDrawingName?: string;
  activeBackdropUrl?: string | null;
}

export const CADViewer: React.FC<CADViewerProps> = ({
  entities,
  rooms,
  assets,
  onSelectAsset,
  activeRevision,
  onAddAssetAtCoord,
  onRunAIAnalysisForDrawing,
  onOpenDriveModal,
  onOpenExcelImport,
  onDrawingUploaded,
  activeDrawingName: propActiveDrawingName,
  activeBackdropUrl: propActiveBackdropUrl
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Canvas Viewport Pan & Zoom State
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 30 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Custom Uploaded Backdrop / Drawing State
  const [currentDrawingName, setCurrentDrawingName] = useState<string>(
    propActiveDrawingName || 'TSN-T2-MEP-E-01.dxf'
  );
  const [uploadedBackdropUrl, setUploadedBackdropUrl] = useState<string | null>(
    propActiveBackdropUrl || null
  );
  const [isPdf, setIsPdf] = useState<boolean>(
    propActiveDrawingName?.toLowerCase().endsWith('.pdf') || false
  );
  const [customEntities, setCustomEntities] = useState<CADEntity[]>([]);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [uploadSuccessAlert, setUploadSuccessAlert] = useState<string | null>(null);

  // Sync with props if updated externally
  useEffect(() => {
    if (propActiveDrawingName) {
      setCurrentDrawingName(propActiveDrawingName);
      setIsPdf(propActiveDrawingName.toLowerCase().endsWith('.pdf'));
    }
    if (propActiveBackdropUrl !== undefined) {
      setUploadedBackdropUrl(propActiveBackdropUrl);
    }
  }, [propActiveDrawingName, propActiveBackdropUrl]);

  // Mode: Pin New Asset
  const [isPinMode, setIsPinMode] = useState(false);

  // Cursor Real-Time CAD Coordinates
  const [cursorCAD, setCursorCAD] = useState<{
    x: number;
    y: number;
    room?: Room | null;
  }>({
    x: 0,
    y: 0,
    room: null
  });

  // Selected Entity / Asset
  const [selectedEntity, setSelectedEntity] = useState<CADEntity | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Layer Visibility
  const [layerVisibility, setLayerVisibility] = useState<Record<SystemDiscipline, boolean>>({
    ARCHITECTURE: true,
    ELECTRICAL: true,
    HVAC: true,
    FIRE_PROTECTION: true,
    PLUMBING: true,
    BMS: true,
    STRUCTURAL: true
  });

  const toggleLayer = (disc: SystemDiscipline) => {
    setLayerVisibility(prev => ({ ...prev, [disc]: !prev[disc] }));
  };

  // Convert SVG coordinates to CAD Coordinates (mm)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Inverse transform
    const svgX = (mouseX - pan.x) / scale;
    const svgY = (mouseY - pan.y) / scale;

    // Convert to mm (1 SVG unit = 100mm)
    const cadX = Math.round(Math.max(0, svgX * 100));
    const cadY = Math.round(Math.max(0, svgY * 100));

    const currentRoom = findRoomForCADCoordinate({ x: cadX, y: cadY }, rooms);
    setCursorCAD({ x: cadX, y: cadY, room: currentRoom });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      if (isPinMode) {
        // Pin new asset at coordinate
        if (onAddAssetAtCoord) {
          onAddAssetAtCoord(cursorCAD.x, cursorCAD.y, cursorCAD.room?.roomName);
          setIsPinMode(false);
          return;
        }
      }
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleZoom = (factor: number) => {
    setScale(prev => Math.min(Math.max(0.3, prev * factor), 5));
  };

  const resetView = () => {
    setScale(1);
    setPan({ x: 40, y: 30 });
  };

  // Direct File Upload into CAD Viewer (DXF, DWG, PDF, SVG, Images)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingFile(true);
    setUploadSuccessAlert(null);
    setCurrentDrawingName(file.name);

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isFilePdf = ext === 'pdf';
    setIsPdf(isFilePdf);

    try {
      if (ext === 'dxf') {
        // 1. DXF Text Parsing
        const reader = new FileReader();
        reader.onload = () => {
          const text = reader.result as string;
          try {
            const result = parseDXFText(text, file.name);
            setCustomEntities(result.entities);
            setUploadedBackdropUrl(null);

            setUploadSuccessAlert(
              `Đã nạp bản vẽ DXF "${file.name}": Trích xuất ${result.entities.length} thực thể vector và ${result.extractedAssets.length} thiết bị nhận diện!`
            );

            if (onDrawingUploaded) {
              onDrawingUploaded({
                fileName: file.name,
                fileType: 'dxf',
                entities: result.entities,
                extractedAssets: result.extractedAssets,
                backdropUrl: null
              });
            }
          } catch (err) {
            console.warn('DXF parse error:', err);
          } finally {
            setIsParsingFile(false);
          }
        };
        reader.readAsText(file);
      } else if (ext === 'dwg') {
        // 2. AutoCAD DWG Binary Parsing
        const result = await parseDWGBuffer(file);
        setCustomEntities(result.entities);
        setUploadedBackdropUrl(null);

        setUploadSuccessAlert(
          `Đã nạp file AutoCAD DWG "${file.name}": Khởi tạo ${result.entities.length} thực thể và ${result.extractedAssets.length} vị trí phân khu!`
        );

        if (onDrawingUploaded) {
          onDrawingUploaded({
            fileName: file.name,
            fileType: 'dwg',
            entities: result.entities,
            extractedAssets: result.extractedAssets,
            backdropUrl: null
          });
        }
        setIsParsingFile(false);
      } else {
        // 3. Image (PNG, JPG, WEBP, SVG) or PDF: render as backdrop
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          setUploadedBackdropUrl(dataUrl);
          setIsParsingFile(false);

          setUploadSuccessAlert(
            `Đã nạp bản vẽ ${isFilePdf ? 'PDF' : 'hình ảnh'} "${file.name}" vào nền mặt bằng CAD. Sẵn sàng ghim thiết bị và đo tọa độ!`
          );

          if (onDrawingUploaded) {
            const base64 = dataUrl.split(',')[1] || '';
            onDrawingUploaded({
              fileName: file.name,
              fileType: isFilePdf ? 'pdf' : 'image',
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
      console.error('File load error:', err);
      setIsParsingFile(false);
    }

    // Reset input so same file can be reselected if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Combine default sample entities with any custom uploaded DXF/DWG entities
  const allDisplayEntities = customEntities.length > 0 ? customEntities : entities;

  // Filter entities by layer visibility and search
  const visibleEntities = allDisplayEntities.filter(ent => {
    if (!layerVisibility[ent.discipline]) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        ent.text?.toLowerCase().includes(q) ||
        ent.cadHandle.toLowerCase().includes(q) ||
        ent.layer.toLowerCase().includes(q) ||
        ent.assetTag?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col lg:flex-row h-[760px] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl relative">
      {/* CAD Canvas Area */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setIsDragging(false)}
        className={`flex-1 relative overflow-hidden select-none bg-[#090D16] ${
          isPinMode ? 'cursor-crosshair' : isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {/* CAD Grid Background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(#38bdf8 1px, transparent 1px), radial-gradient(#64748b 1px, transparent 1px)',
            backgroundSize: '40px 40px, 10px 10px'
          }}
        />

        {/* Top CAD Control Bar with Upload & Analysis Buttons */}
        <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-xl p-2 shadow-xl">
          {/* Left section: Upload & Switch Drawing */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              accept=".dxf,.dwg,.pdf,.svg,.png,.jpg,.jpeg,.webp"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition"
              title="Tải bản vẽ CAD (DXF, DWG) hoặc PDF, SVG, Ảnh lên để xem và cập nhật trực tiếp"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Tải Bản Vẽ Lên (CAD/PDF)</span>
            </button>

            {onOpenDriveModal && (
              <button
                onClick={onOpenDriveModal}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                title="Chọn bản vẽ từ Google Drive"
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Google Drive</span>
              </button>
            )}

            {onOpenExcelImport && (
              <button
                onClick={onOpenExcelImport}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition"
                title="Import file Excel (.xlsx) danh mục thiết bị"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Import Excel (.xlsx)</span>
              </button>
            )}

            {/* Drawing Switcher Preset */}
            <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white">
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <select
                value={currentDrawingName}
                onChange={e => {
                  const val = e.target.value;
                  setCurrentDrawingName(val);
                  setUploadedBackdropUrl(null);
                  setCustomEntities([]);
                  setIsPdf(false);
                  setUploadSuccessAlert(null);
                }}
                className="bg-transparent text-white font-medium text-xs focus:outline-none cursor-pointer max-w-[190px] truncate"
              >
                <option value="TSN-T2-MEP-E-01.dxf" className="bg-slate-900">Mặt bằng Điện & Máng cáp (TSN-T2-E01)</option>
                <option value="TSN-T2-MEP-M-02.dxf" className="bg-slate-900">Mặt bằng HVAC & Ống gió (TSN-T2-M02)</option>
                <option value="TSN-T2-MEP-FP-01.dxf" className="bg-slate-900">Mặt bằng Trạm bơm PCCC B1 (FP-01)</option>
                <option value="TSN-T2-ARCH-01.dxf" className="bg-slate-900">Mặt bằng Kiến trúc Sảnh Đến & WC (ARCH-01)</option>
                {uploadedBackdropUrl || customEntities.length > 0 ? (
                  <option value={currentDrawingName} className="bg-slate-900">★ {currentDrawingName} (Đã Tải Lên)</option>
                ) : null}
              </select>
            </div>

            {/* Quick Pin to Add Mode Toggle */}
            <button
              onClick={() => setIsPinMode(!isPinMode)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition ${
                isPinMode
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md animate-pulse'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="Bật chế độ ghim thiết bị mới tại vị trí click chuột"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{isPinMode ? 'Chế độ Ghim: Click lên Bản vẽ' : 'Ghim Thiết Bị'}</span>
            </button>
          </div>

          {/* Right section: AI Analysis, Search, Zoom and Layer Filters */}
          <div className="flex items-center gap-2">
            {onRunAIAnalysisForDrawing && (
              <button
                onClick={() => onRunAIAnalysisForDrawing(currentDrawingName)}
                className="px-2.5 py-1.5 bg-indigo-600/40 hover:bg-indigo-600/60 text-indigo-200 border border-indigo-500/50 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                title="Mở bảng phân tích chuyên sâu với Gemini AI"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>AI Phân Tích [↗]</span>
              </button>
            )}

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm handle, tag, layer..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 w-36 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              onClick={() => handleZoom(1.2)}
              title="Phóng to"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleZoom(0.8)}
              title="Thu nhỏ"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={resetView}
              title="Reset khung nhìn"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Upload Success Banner */}
        {uploadSuccessAlert && (
          <div className="absolute top-16 left-4 right-4 z-20 bg-emerald-950/90 border border-emerald-500/50 rounded-xl p-3 shadow-2xl flex items-center justify-between text-xs text-emerald-300 backdrop-blur">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{uploadSuccessAlert}</span>
            </div>
            <button
              onClick={() => setUploadSuccessAlert(null)}
              className="text-slate-400 hover:text-white ml-2 text-sm"
            >
              ✕
            </button>
          </div>
        )}

        {/* Live Loading Overlay */}
        {isParsingFile && (
          <div className="absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center gap-3 text-white">
            <RefreshCw className="w-9 h-9 text-indigo-400 animate-spin" />
            <div className="text-sm font-bold">Đang nạp và trích xuất thực thể từ "{currentDrawingName}"...</div>
            <div className="text-xs text-slate-400">Tự động nhận diện tọa độ X, Y, phân lớp và danh mục thiết bị</div>
          </div>
        )}

        {/* Live CAD SVG Canvas with Zoom & Pan */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.05s ease-out'
          }}
          className="absolute inset-0 w-full h-full"
        >
          {/* If an image or SVG was uploaded by user, render as base floorplan underlay */}
          {uploadedBackdropUrl && !isPdf && (
            <img
              src={uploadedBackdropUrl}
              alt={currentDrawingName}
              className="absolute left-0 top-0 w-[700px] h-[500px] object-contain pointer-events-none opacity-90 select-none"
            />
          )}

          {/* If a PDF was uploaded, render embedded PDF object underlay */}
          {uploadedBackdropUrl && isPdf && (
            <div className="absolute left-0 top-0 w-[700px] h-[500px] bg-slate-900 rounded-lg overflow-hidden border border-slate-700 pointer-events-none opacity-90">
              <object
                data={`${uploadedBackdropUrl}#toolbar=0&navpanes=0`}
                type="application/pdf"
                className="w-full h-full"
              >
                <iframe
                  src={`${uploadedBackdropUrl}#toolbar=0&navpanes=0`}
                  className="w-full h-full"
                  title="PDF Bản Vẽ"
                />
              </object>
            </div>
          )}

          <svg
            viewBox="0 0 700 500"
            className="w-[700px] h-[500px] overflow-visible relative z-10"
            style={{ width: '700px', height: '500px' }}
          >
            {/* SVG Image Underlay if not PDF */}
            {uploadedBackdropUrl && !isPdf && (
              <image
                href={uploadedBackdropUrl}
                x="0"
                y="0"
                width="700"
                height="500"
                preserveAspectRatio="xMidYMid meet"
                opacity="0.85"
              />
            )}

            {/* Grid Lines (Columns 1-4, Trục A-C) */}
            <g opacity="0.3" stroke="#475569" strokeWidth="1" strokeDasharray="4 4">
              <line x1="120" y1="100" x2="120" y2="420" />
              <line x1="230" y1="100" x2="230" y2="420" />
              <line x1="370" y1="100" x2="370" y2="420" />
              <line x1="580" y1="100" x2="580" y2="420" />
              <line x1="80" y1="150" x2="620" y2="150" />
              <line x1="80" y1="250" x2="620" y2="250" />
              <line x1="80" y1="360" x2="620" y2="360" />

              <text x="120" y="85" fill="#94a3b8" fontSize="11" textAnchor="middle">Trục 1</text>
              <text x="230" y="85" fill="#94a3b8" fontSize="11" textAnchor="middle">Trục 2</text>
              <text x="370" y="85" fill="#94a3b8" fontSize="11" textAnchor="middle">Trục 3</text>
              <text x="580" y="85" fill="#94a3b8" fontSize="11" textAnchor="middle">Trục 4</text>
              <text x="65" y="153" fill="#94a3b8" fontSize="11" textAnchor="middle">Trục A</text>
              <text x="65" y="253" fill="#94a3b8" fontSize="11" textAnchor="middle">Trục B</text>
              <text x="65" y="363" fill="#94a3b8" fontSize="11" textAnchor="middle">Trục C</text>
            </g>

            {/* Room Boundaries (Polygons) */}
            {layerVisibility.ARCHITECTURE &&
              rooms.map(room => {
                const isHovered = cursorCAD.room?.roomId === room.roomId;
                const pointsSvg = room.polygon
                  .map(p => `${p.x / 100},${p.y / 100}`)
                  .join(' ');
                const centroidX = room.polygon.reduce((acc, p) => acc + p.x, 0) / room.polygon.length / 100;
                const centroidY = room.polygon.reduce((acc, p) => acc + p.y, 0) / room.polygon.length / 100;

                return (
                  <g key={room.roomId}>
                    <polygon
                      points={pointsSvg}
                      fill={isHovered ? 'rgba(56, 189, 248, 0.15)' : 'rgba(30, 41, 59, 0.45)'}
                      stroke={isHovered ? '#38bdf8' : '#475569'}
                      strokeWidth={isHovered ? '2' : '1.2'}
                      strokeDasharray={room.boundaryStatus === 'CLOSED_POLYGON' ? 'none' : '4 2'}
                      className="transition-all duration-200 cursor-pointer"
                    />
                    <text
                      x={centroidX}
                      y={centroidY - 8}
                      fill="#e2e8f0"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="pointer-events-none"
                    >
                      {room.roomNumber}
                    </text>
                    <text
                      x={centroidX}
                      y={centroidY + 4}
                      fill="#94a3b8"
                      fontSize="7"
                      textAnchor="middle"
                      className="pointer-events-none"
                    >
                      {room.roomName}
                    </text>
                    <text
                      x={centroidX}
                      y={centroidY + 14}
                      fill="#38bdf8"
                      fontSize="7"
                      fontWeight="600"
                      textAnchor="middle"
                      className="pointer-events-none"
                    >
                      {room.areaSqm} m² (Shoelace)
                    </text>
                  </g>
                );
              })}

            {/* Vector CAD Entities (From uploaded DXF/DWG or standard dataset) */}
            {visibleEntities.map(ent => {
              const isSelected = selectedEntity?.entityId === ent.entityId;

              // Polylines & Lines with vertices
              if (ent.vertices && ent.vertices.length >= 2) {
                const pathPoints = ent.vertices.map(v => `${v.x / 100},${v.y / 100}`).join(' L ');
                return (
                  <g
                    key={ent.entityId}
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedEntity(ent);
                    }}
                    className="cursor-pointer group"
                  >
                    <path
                      d={`M ${pathPoints}`}
                      fill="none"
                      stroke={isSelected ? '#ffffff' : ent.color || '#38bdf8'}
                      strokeWidth={isSelected ? '5' : '3'}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {isSelected && (
                      <path
                        d={`M ${pathPoints}`}
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="8"
                        opacity="0.4"
                      />
                    )}
                  </g>
                );
              }

              // Circles
              if (ent.entityType === 'CIRCLE') {
                const cx = ent.coordinates.x / 100;
                const cy = ent.coordinates.y / 100;
                const r = (ent.radius || 400) / 100;
                return (
                  <circle
                    key={ent.entityId}
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="none"
                    stroke={isSelected ? '#ffffff' : ent.color || '#38bdf8'}
                    strokeWidth={isSelected ? '4' : '2'}
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedEntity(ent);
                    }}
                    className="cursor-pointer"
                  />
                );
              }

              // Equipment & Block Entities (INSERT, TEXT, MTEXT)
              const svgX = ent.coordinates.x / 100;
              const svgY = ent.coordinates.y / 100;

              return (
                <g
                  key={ent.entityId}
                  transform={`translate(${svgX}, ${svgY})`}
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedEntity(ent);
                    if (ent.assetTag && onSelectAsset) {
                      const matched = assets.find(a => a.assetTag === ent.assetTag);
                      if (matched) onSelectAsset(matched);
                    }
                  }}
                  className="cursor-pointer group"
                >
                  <circle
                    r={isSelected ? '10' : '6'}
                    fill={ent.color || '#eab308'}
                    stroke="#0f172a"
                    strokeWidth="2"
                    className="transition-transform group-hover:scale-125"
                  />
                  {isSelected && (
                    <circle
                      r="16"
                      fill="none"
                      stroke="#818cf8"
                      strokeWidth="2"
                      strokeDasharray="3 3"
                      className="animate-spin"
                    />
                  )}
                  <text
                    y="-9"
                    fill="#f8fafc"
                    fontSize="7"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="select-none pointer-events-none shadow"
                  >
                    {ent.assetTag || ent.text}
                  </text>
                </g>
              );
            })}

            {/* Live Crosshair Marker */}
            <g pointerEvents="none" transform={`translate(${cursorCAD.x / 100}, ${cursorCAD.y / 100})`}>
              <line x1="-12" y1="0" x2="12" y2="0" stroke="#f43f5e" strokeWidth="1.2" />
              <line x1="0" y1="-12" x2="0" y2="12" stroke="#f43f5e" strokeWidth="1.2" />
              <circle r="4" fill="none" stroke="#f43f5e" strokeWidth="1" />
            </g>
          </svg>
        </div>

        {/* Bottom Coordinates & Spatial Info Bar */}
        <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-xl px-4 py-2 text-xs shadow-xl">
          <div className="flex items-center gap-4 text-slate-300 font-mono">
            <div className="flex items-center gap-1.5 text-sky-400">
              <Crosshair className="w-3.5 h-3.5" />
              <span>X: <strong className="text-white">{cursorCAD.x.toLocaleString()}</strong> mm</span>
              <span className="mx-1">|</span>
              <span>Y: <strong className="text-white">{cursorCAD.y.toLocaleString()}</strong> mm</span>
            </div>

            <div className="hidden sm:flex items-center gap-1 text-slate-400 text-[11px]">
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              <span>VN2000 Tân Sơn Nhất</span>
            </div>

            {cursorCAD.room && (
              <div className="flex items-center gap-1 text-emerald-400 font-sans">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{cursorCAD.room.roomName} ({cursorCAD.room.roomNumber})</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 text-slate-400 text-[11px]">
            <span className="text-amber-400 font-medium">Bản vẽ: {currentDrawingName}</span>
            <span>•</span>
            <span className="font-mono text-indigo-300">Zoom: {Math.round(scale * 100)}%</span>
            <span>•</span>
            <span>{visibleEntities.length} đối tượng</span>
          </div>
        </div>
      </div>

      {/* Right Sidebar: Layer Manager & Entity Inspector */}
      <div className="w-full lg:w-80 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 p-4 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-4">
          {/* Layer Filter Toolbar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-semibold text-xs uppercase tracking-wider">
                <Layers className="w-4 h-4 text-sky-400" />
                <span>Phân Lớp Kỹ Thuật (Layers)</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">{activeRevision}</span>
            </div>

            <div className="space-y-1.5">
              {[
                { key: 'ELECTRICAL' as SystemDiscipline, label: 'Điện & Máng cáp', color: 'bg-amber-400' },
                { key: 'HVAC' as SystemDiscipline, label: 'HVAC & Ống gió', color: 'bg-sky-400' },
                { key: 'FIRE_PROTECTION' as SystemDiscipline, label: 'PCCC & Trạm bơm', color: 'bg-rose-500' },
                { key: 'ARCHITECTURE' as SystemDiscipline, label: 'Kiến trúc, Thang & Phòng', color: 'bg-purple-500' },
                { key: 'PLUMBING' as SystemDiscipline, label: 'Cấp thoát nước & WC', color: 'bg-teal-500' }
              ].map(item => (
                <button
                  key={item.key}
                  onClick={() => toggleLayer(item.key)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition ${
                    layerVisibility[item.key]
                      ? 'bg-slate-800 text-white font-medium'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.color}`}></span>
                    <span>{item.label}</span>
                  </div>
                  {layerVisibility[item.key] ? (
                    <Eye className="w-3.5 h-3.5 text-sky-400" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Active Drawing Summary Card */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">Bản vẽ đang xem:</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30">
                {isPdf ? 'PDF Plan' : uploadedBackdropUrl ? 'Ảnh Raster' : 'CAD Vector'}
              </span>
            </div>
            <div className="text-white font-bold text-xs truncate">{currentDrawingName}</div>
            <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-850">
              <span>Thực thể hiển thị:</span>
              <span className="font-mono text-sky-400 font-bold">{visibleEntities.length} đối tượng</span>
            </div>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2 text-white font-semibold text-xs uppercase tracking-wider">
              <Info className="w-4 h-4 text-indigo-400" />
              <span>Thông Số Thực Thể CAD</span>
            </div>
          </div>

          {selectedEntity ? (
            <div className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/70">
                <div className="text-[11px] text-slate-400 uppercase font-semibold mb-1">Thực thể đã chọn</div>
                <div className="text-white font-bold text-sm flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  <span>{selectedEntity.assetTag || selectedEntity.text || selectedEntity.cadHandle}</span>
                </div>
                <div className="text-slate-300 mt-1 font-mono text-[11px]">
                  Handle CAD: <span className="text-amber-300 font-bold">{selectedEntity.cadHandle}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-800">
                  <div className="text-slate-400">Loại đối tượng</div>
                  <div className="text-white font-medium">{selectedEntity.entityType}</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-800">
                  <div className="text-slate-400">Layer CAD</div>
                  <div className="text-white font-medium truncate">{selectedEntity.layer}</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-800">
                  <div className="text-slate-400">Hệ thống</div>
                  <div className="text-sky-300 font-medium">{selectedEntity.discipline}</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-800">
                  <div className="text-slate-400">Trạng thái</div>
                  <div className="text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> VERIFIED
                  </div>
                </div>
              </div>

              {/* Exact CAD Coordinates */}
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1 font-mono">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Tọa độ không gian CAD</div>
                <div className="text-slate-200">X: {selectedEntity.coordinates.x.toLocaleString()} mm</div>
                <div className="text-slate-200">Y: {selectedEntity.coordinates.y.toLocaleString()} mm</div>
                <div className="text-slate-200">Z: {selectedEntity.coordinates.z || 0} mm</div>
                <div className="text-[10px] text-slate-400 pt-1">Hệ quy chiếu: {selectedEntity.coordinates.coordinateSystem}</div>
              </div>

              {/* Linked Asset Action */}
              {selectedEntity.assetTag && (
                <button
                  onClick={() => {
                    const matched = assets.find(a => a.assetTag === selectedEntity.assetTag);
                    if (matched && onSelectAsset) onSelectAsset(matched);
                  }}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition shadow flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Xem Hồ sơ Digital Twin</span>
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400 text-xs">
              <Compass className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p>Nhấp chuột vào bất kỳ thiết bị, đường ống hoặc phòng trên bản vẽ để xem thông số và tọa độ CAD.</p>
            </div>
          )}
        </div>

        {/* Legend Summary */}
        <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-1.5">
          <div className="font-semibold text-slate-300">Ghi chú màu hệ thống (Legend):</div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded bg-amber-400"></span>
            <span>⚡ Điện & Máng cáp (E-PANEL, E-TRAY)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded bg-sky-400"></span>
            <span>❄️ HVAC: Ống gió, AHU, Chiller (M-DUCT)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded bg-rose-500"></span>
            <span>🚒 Cứu hỏa PCCC & Bơm (FP-SPRINKLER)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded bg-purple-500"></span>
            <span>🪜 Thang cuốn / Thang máy (ARCH)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded bg-teal-500"></span>
            <span>🚻 Nhà vệ sinh (PLUMB-WC)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
