/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  Layers,
  Calculator,
  Camera,
  ShieldCheck,
  GitCompare,
  HardDrive,
  Bot,
  ShieldAlert,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Sparkles,
  MapPin,
  TrendingUp,
  Activity
} from 'lucide-react';

import { Header } from './components/Header';
import { CADViewer } from './components/CADViewer/CADViewer';
import { QuantityTakeoff } from './components/Takeoff/QuantityTakeoff';
import { PhotoAssetMatcher } from './components/PhotoAsset/PhotoAssetMatcher';
import { AssetRegistry } from './components/DigitalTwin/AssetRegistry';
import { RevisionDiffViewer } from './components/RevisionCompare/RevisionDiffViewer';
import { WorkspaceDashboard } from './components/WorkspaceHub/WorkspaceDashboard';
import { GeminiChatbot } from './components/AIChat/GeminiChatbot';
import { TechnicalDossierModal } from './components/Dossier/TechnicalDossierModal';
import { ReviewQueueModal } from './components/QualityQA/ReviewQueueModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { DrawingAnalysisManager } from './components/DrawingAnalysis/DrawingAnalysisManager';
import { LiveFieldVoiceLogger } from './components/LiveVoiceLog/LiveFieldVoiceLogger';
import { ExcelImportModal } from './components/ExcelImport/ExcelImportModal';

import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken
} from './services/firebaseAuth';
import {
  createMasterSpreadsheet,
  createMaintenanceCalendarEvent,
  uploadReportToDrive
} from './services/workspaceService';

import {
  SAMPLE_PROJECT,
  SAMPLE_ASSETS,
  SAMPLE_QUANTITIES,
  SAMPLE_ROOMS,
  SAMPLE_ENTITIES
} from './data/sampleCADData';
import { Asset, QuantityItem, Room, CADEntity } from './types';
import { parseDXFText } from './services/cadParser';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<
    'LIVE_VOICE_LOG' | 'DRAWING_ANALYSIS' | 'CAD_VIEWER' | 'TAKEOFF' | 'PHOTO_MATCH' | 'DIGITAL_TWIN' | 'REVISION_DIFF' | 'WORKSPACE_HUB' | 'AI_CHAT'
  >('LIVE_VOICE_LOG');

  // Firebase Auth & Workspace connection state
  const [user, setUser] = useState<User | null>(null);
  const [hasWorkspaceToken, setHasWorkspaceToken] = useState<boolean>(false);

  // Core Project State
  const [project] = useState(SAMPLE_PROJECT);
  const [assets, setAssets] = useState<Asset[]>(SAMPLE_ASSETS);
  const [quantities, setQuantities] = useState<QuantityItem[]>(SAMPLE_QUANTITIES);
  const [rooms] = useState<Room[]>(SAMPLE_ROOMS);
  const [entities, setEntities] = useState<CADEntity[]>(SAMPLE_ENTITIES);

  // Active Drawing & Revision
  const [activeRevision, setActiveRevision] = useState('Rev.03 (As-built)');
  const [activeDrawing, setActiveDrawing] = useState<{
    name: string;
    type: string;
    backdropUrl: string | null;
    base64?: string | null;
  }>({
    name: 'TSN-T2-MEP-E-01.dxf',
    type: 'preset',
    backdropUrl: null
  });

  // Central Drawing Upload Handler: Updates entities, assets, and active drawing across tabs
  const handleDrawingUploaded = (info: {
    fileName: string;
    fileType: string;
    entities: CADEntity[];
    extractedAssets: Asset[];
    backdropUrl: string | null;
    base64?: string;
  }) => {
    setActiveDrawing({
      name: info.fileName,
      type: info.fileType,
      backdropUrl: info.backdropUrl,
      base64: info.base64
    });

    if (info.entities.length > 0) {
      setEntities(info.entities);
    }

    if (info.extractedAssets.length > 0) {
      setAssets(prev => {
        const existingTags = new Set(prev.map(a => a.assetTag));
        const newItems = info.extractedAssets.filter(a => !existingTags.has(a.assetTag));
        return [...newItems, ...prev];
      });
    }

    showToast(
      `Đã cập nhật bản vẽ: "${info.fileName}" (${info.entities.length} thực thể vector, ${info.extractedAssets.length} thiết bị nhận diện)!`
    );
  };

  // Modals
  const [dossierAsset, setDossierAsset] = useState<Asset | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [isReviewQueueOpen, setIsReviewQueueOpen] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);

  // Workspace Sync State
  const [isExportingSheets, setIsExportingSheets] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Workspace Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Initialize Firebase Auth listener on mount
  useEffect(() => {
    initAuth(
      (authenticatedUser, token) => {
        setUser(authenticatedUser);
        setHasWorkspaceToken(!!token);
      },
      () => {
        setUser(null);
        setHasWorkspaceToken(false);
      }
    );
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSignIn = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setHasWorkspaceToken(true);
        showToast('Kết nối Google Workspace thành công!');
      }
    } catch (err: any) {
      console.error('Sign in failed:', err);
      showToast(`Lỗi kết nối: ${err.message || 'Không thể đăng nhập'}`);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setHasWorkspaceToken(false);
    showToast('Đã đăng xuất tài khoản Google.');
  };

  // Recalculate quantities with vector CAD engine
  const handleRecalculateTakeoff = () => {
    showToast('Đã tính toán lại toàn bộ khối lượng từ Vector CAD geometry.');
  };

  // Trigger Google Sheets export with explicit user confirmation
  const handleExportToSheets = () => {
    if (!hasWorkspaceToken) {
      handleSignIn();
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Xác nhận Đồng bộ Bảng tính Google Sheets?',
      message: `Hệ thống sẽ tạo file Google Sheets mới trên Google Drive của bạn gồm danh sách ${assets.length} thiết bị và ${quantities.length} hạng mục bóc tách chi tiết.`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setIsExportingSheets(true);
        try {
          const res = await createMasterSpreadsheet(
            `TSN_T2_CAD_MEP_Takeoff_${new Date().toISOString().slice(0, 10)}`,
            assets,
            quantities
          );
          showToast(`Đã xuất Google Sheets thành công! ID: ${res.spreadsheetId}`);
        } catch (err: any) {
          showToast(`Lỗi đồng bộ: ${err.message}`);
        } finally {
          setIsExportingSheets(false);
        }
      }
    });
  };

  // Photo-to-asset confirmation callback
  const handleConfirmPhotoMatch = (asset: Asset, photoUrl: string, analysisText: string) => {
    const updatedAssets = assets.map(a => {
      if (a.assetId === asset.assetId) {
        return {
          ...a,
          lastVerifiedAt: new Date().toLocaleString(),
          verifiedBy: user?.displayName || 'Kỹ sư Giám sát Hiện trường',
          referencePhotoUrl: photoUrl,
          inspectionHistory: [
            {
              logId: `LOG-${Date.now().toString().slice(-4)}`,
              timestamp: new Date().toLocaleString(),
              user: user?.displayName || 'Kỹ sư Hiện trường',
              action: 'VERIFIED' as const,
              description: `Khớp thành công qua Camera & OCR Nameplate. Ghi nhận: ${analysisText.slice(0, 120)}...`
            },
            ...a.inspectionHistory
          ]
        };
      }
      return a;
    });

    setAssets(updatedAssets);
    showToast(`Đã liên kết ảnh hiện trường và cập nhật Digital Twin cho ${asset.assetTag}!`);
  };

  // Schedule Maintenance in Google Calendar with explicit confirmation
  const handleScheduleCalendar = (asset: Asset) => {
    if (!hasWorkspaceToken) {
      handleSignIn();
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: `Lên lịch Kiểm tra ${asset.assetTag} trên Google Calendar?`,
      message: `Tạo lịch bảo trì định kỳ cho thiết bị ${asset.assetName} tại ${asset.room} vào lúc 09:00 sáng Thứ Hai tuần tới trên Google Calendar của bạn.`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const nextMonday = new Date();
          nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7));
          nextMonday.setHours(9, 0, 0, 0);

          await createMaintenanceCalendarEvent({
            summary: `[Bảo trì MEP] Kiểm định định kỳ ${asset.assetTag}`,
            description: `Kiểm tra thông số kỹ thuật, nhiệt độ tiếp xúc, độ ồn và rung động của ${asset.assetName} tại ${asset.room}. Tọa độ CAD: X=${asset.cadCoordinates.x}, Y=${asset.cadCoordinates.y}.`,
            start: { dateTime: nextMonday.toISOString(), timeZone: 'Asia/Ho_Chi_Minh' },
            end: {
              dateTime: new Date(nextMonday.getTime() + 60 * 60 * 1000).toISOString(),
              timeZone: 'Asia/Ho_Chi_Minh'
            },
            location: 'Nhà ga Quốc tế T2 - Sân bay Tân Sơn Nhất'
          });
          showToast(`Đã thêm lịch bảo trì ${asset.assetTag} vào Google Calendar!`);
        } catch (err: any) {
          showToast(`Lỗi tạo lịch Calendar: ${err.message}`);
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* App Header */}
      <Header
        user={user}
        hasWorkspaceToken={hasWorkspaceToken}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        activeProjectName={project.name}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-4 z-50 bg-slate-900 border border-indigo-500 text-indigo-200 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 backdrop-blur p-2 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'LIVE_VOICE_LOG', label: '🎙️ Live Voice & Auto-Log Sheet', icon: Sparkles, color: 'text-rose-400' },
              { id: 'DRAWING_ANALYSIS', label: 'AI Phân Tích & Quản Lý Mặt Bằng', icon: Sparkles, color: 'text-amber-400' },
              { id: 'CAD_VIEWER', label: 'Bản vẽ & CAD Viewer', icon: Layers, color: 'text-indigo-400' },
              { id: 'TAKEOFF', label: 'Bóc tách Khối lượng (BOQ)', icon: Calculator, color: 'text-emerald-400' },
              { id: 'PHOTO_MATCH', label: 'Nhận diện Hiện trường', icon: Camera, color: 'text-sky-400' },
              { id: 'DIGITAL_TWIN', label: 'Hồ sơ Thiết bị Digital Twin', icon: ShieldCheck, color: 'text-teal-400' },
              { id: 'REVISION_DIFF', label: 'So sánh Revision', icon: GitCompare, color: 'text-purple-400' },
              { id: 'WORKSPACE_HUB', label: 'Google Workspace Hub', icon: HardDrive, color: 'text-blue-400' },
              { id: 'AI_CHAT', label: 'Trợ lý AI (Multi-Modal)', icon: Bot, color: 'text-rose-400' }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : tab.color}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Review Queue Trigger */}
          <button
            onClick={() => setIsReviewQueueOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-500/30 transition"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Hàng đợi Duyệt QA/QC (3)</span>
          </button>
        </div>

        {/* Dynamic Tab Body */}
        <div>
          {activeTab === 'LIVE_VOICE_LOG' && (
            <LiveFieldVoiceLogger
              hasWorkspaceToken={hasWorkspaceToken}
              onRequireAuth={handleSignIn}
              engineerName={user?.displayName || 'KS. Nguyễn Văn Hậu'}
            />
          )}

          {activeTab === 'DRAWING_ANALYSIS' && (
            <DrawingAnalysisManager
              assets={assets}
              rooms={rooms}
              onAddAsset={newAsset => {
                setAssets(prev => [newAsset, ...prev]);
                showToast(`Đã thêm mới thiết bị/phòng: ${newAsset.assetTag} (${newAsset.assetName})!`);
              }}
              onUpdateAsset={updatedAsset => {
                setAssets(prev => prev.map(a => (a.assetId === updatedAsset.assetId ? updatedAsset : a)));
                showToast(`Đã cập nhật thông số ${updatedAsset.assetTag}!`);
              }}
              onDeleteAsset={assetId => {
                const target = assets.find(a => a.assetId === assetId);
                setConfirmModal({
                  isOpen: true,
                  title: `Xác nhận Xóa / Bớt ${target?.assetTag || 'thiết bị'}?`,
                  message: `Bạn có chắc chắn muốn xóa ${target?.assetName || 'thiết bị này'} khỏi cơ sở dữ liệu mặt bằng? Hành động này có thể hoàn tác trong nhật ký audit log.`,
                  onConfirm: () => {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    setAssets(prev => prev.filter(a => a.assetId !== assetId));
                    showToast(`Đã xóa ${target?.assetTag || 'thiết bị'} khỏi mặt bằng.`);
                  }
                });
              }}
              onExportSheets={handleExportToSheets}
              onSaveToDrive={async (fileName, content) => {
                if (!hasWorkspaceToken) {
                  handleSignIn();
                  return;
                }
                try {
                  await uploadReportToDrive(fileName, content);
                  showToast(`Đã lưu file ${fileName} lên Google Drive thành công!`);
                } catch (err: any) {
                  showToast(`Lỗi lưu Drive: ${err.message}`);
                }
              }}
              onSendEmailReport={() => {
                setActiveTab('WORKSPACE_HUB');
              }}
              onScheduleCalendar={handleScheduleCalendar}
              hasWorkspaceToken={hasWorkspaceToken}
              onRequireAuth={handleSignIn}
              onSelectAssetForCAD={asset => {
                setActiveTab('CAD_VIEWER');
              }}
              activeDrawingName={activeDrawing.name}
              onDrawingUploaded={handleDrawingUploaded}
              onNavigateToCADViewer={() => setActiveTab('CAD_VIEWER')}
            />
          )}

          {activeTab === 'CAD_VIEWER' && (
            <CADViewer
              entities={entities}
              rooms={rooms}
              assets={assets}
              activeRevision={activeRevision}
              activeDrawingName={activeDrawing.name}
              activeBackdropUrl={activeDrawing.backdropUrl}
              onDrawingUploaded={handleDrawingUploaded}
              onSelectAsset={asset => {
                setDossierAsset(asset);
                setIsDossierOpen(true);
              }}
              onAddAssetAtCoord={(x, y, roomName) => {
                const newAsset: Asset = {
                  assetId: `AST-PIN-${Date.now().toString().slice(-4)}`,
                  assetTag: `AST-PIN-${Math.floor(100 + Math.random() * 900)}`,
                  assetName: `Thiết bị mới ghim tại ${roomName || 'mặt bằng'}`,
                  assetType: 'Tủ điện',
                  system: 'ELECTRICAL',
                  manufacturer: 'Thiết kế mới 2026',
                  model: 'Standard 2026',
                  floor: 'Tầng 1 (Level 1)',
                  zone: 'Zone A',
                  room: roomName || 'Khu vực kỹ thuật',
                  cadCoordinates: {
                    x,
                    y,
                    z: 0,
                    units: 'mm',
                    coordinateSystem: 'VN2000_TSN',
                    sourceHandle: `H-${Math.floor(1000 + Math.random() * 9000).toString(16)}`
                  },
                  sourceDrawing: activeDrawing.name || 'TSN-T2-MEP-PIN.dxf',
                  sourceRevision: 'Rev.04',
                  criticality: 'MEDIUM',
                  status: 'OPERATIONAL',
                  validationStatus: 'VERIFIED',
                  confidence: 0.99,
                  verifiedBy: user?.displayName || 'KS. Hiện trường',
                  lastVerifiedAt: new Date().toLocaleString(),
                  specs: [],
                  inspectionHistory: [
                    {
                      logId: `LOG-${Date.now().toString().slice(-4)}`,
                      timestamp: new Date().toLocaleString(),
                      user: user?.displayName || 'Kỹ sư Giám sát',
                      action: 'CREATED',
                      description: `Ghim và định vị trực tiếp trên bản vẽ CAD tại X=${x}mm, Y=${y}mm.`
                    }
                  ]
                };
                setAssets(prev => [newAsset, ...prev]);
                showToast(`Đã ghim thiết bị mới tại X=${x.toLocaleString()}, Y=${y.toLocaleString()} mm!`);
              }}
              onRunAIAnalysisForDrawing={(name, base64) => {
                setActiveDrawing(prev => ({ ...prev, name, base64: base64 || prev.base64 }));
                setActiveTab('DRAWING_ANALYSIS');
                showToast(`Chuyển sang phân tích chuyên sâu cho bản vẽ ${name}`);
              }}
              onOpenDriveModal={() => {
                setActiveTab('WORKSPACE_HUB');
              }}
              onOpenExcelImport={() => {
                setIsExcelImportOpen(true);
              }}
            />
          )}

          {activeTab === 'TAKEOFF' && (
            <QuantityTakeoff
              quantities={quantities}
              onRecalculate={handleRecalculateTakeoff}
              onExportSheets={handleExportToSheets}
              isExporting={isExportingSheets}
            />
          )}

          {activeTab === 'PHOTO_MATCH' && (
            <PhotoAssetMatcher
              assets={assets}
              onConfirmMatch={handleConfirmPhotoMatch}
              onNavigateToCAD={asset => {
                setActiveTab('CAD_VIEWER');
              }}
            />
          )}

          {activeTab === 'DIGITAL_TWIN' && (
            <AssetRegistry
              assets={assets}
              onSelectAssetForCAD={asset => {
                setActiveTab('CAD_VIEWER');
              }}
              onOpenDossier={asset => {
                setDossierAsset(asset);
                setIsDossierOpen(true);
              }}
              onScheduleCalendar={handleScheduleCalendar}
              onOpenExcelImport={() => {
                setIsExcelImportOpen(true);
              }}
            />
          )}

          {activeTab === 'REVISION_DIFF' && (
            <RevisionDiffViewer drawingTitle={project.drawings[0]?.title || 'TSN-T2-MEP-E-01'} />
          )}

          {activeTab === 'WORKSPACE_HUB' && (
            <WorkspaceDashboard
              assets={assets}
              quantities={quantities}
              hasWorkspaceToken={hasWorkspaceToken}
              onRequireAuth={handleSignIn}
              onImportAssetsFromSheet={importedAssets => {
                setAssets(prev => [...importedAssets, ...prev]);
                showToast(`Đã đồng bộ 2 chiều: Nạp thành công ${importedAssets.length} thiết bị từ Google Sheets!`);
              }}
              onOpenCADDrawingFromDrive={(fileName, content) => {
                const ext = fileName.split('.').pop()?.toLowerCase() || '';
                if (ext === 'dxf') {
                  const res = parseDXFText(content, fileName);
                  handleDrawingUploaded({
                    fileName,
                    fileType: 'dxf',
                    entities: res.entities,
                    extractedAssets: res.extractedAssets,
                    backdropUrl: null
                  });
                } else {
                  setActiveDrawing({
                    name: fileName,
                    type: ext,
                    backdropUrl: null
                  });
                }
                setActiveTab('CAD_VIEWER');
                showToast(`Đã mở và nạp bản vẽ "${fileName}" từ Google Drive sang CAD Viewer!`);
              }}
            />
          )}

          {activeTab === 'AI_CHAT' && <GeminiChatbot />}
        </div>
      </main>

      {/* Technical Dossier Modal */}
      <TechnicalDossierModal
        asset={dossierAsset}
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        onSaveToDrive={async (fileName, content) => {
          if (!hasWorkspaceToken) {
            handleSignIn();
            return;
          }
          try {
            await uploadReportToDrive(fileName, content);
            showToast(`Đã lưu ${fileName} lên Google Drive!`);
          } catch (err: any) {
            showToast(`Lỗi lưu Drive: ${err.message}`);
          }
        }}
      />

      {/* QA/QC Review Queue Modal */}
      <ReviewQueueModal
        isOpen={isReviewQueueOpen}
        onClose={() => setIsReviewQueueOpen(false)}
        onApproveItem={id => {
          showToast(`Đã phê duyệt hạng mục ${id} thành công.`);
        }}
      />

      {/* Excel (.xlsx) Equipment Import Modal */}
      <ExcelImportModal
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        onImportSuccess={(importedAssets, mode) => {
          if (mode === 'REPLACE') {
            setAssets(importedAssets);
            showToast(`Đã thay thế toàn bộ dữ liệu bằng ${importedAssets.length} thiết bị từ file Excel!`);
          } else {
            setAssets(prev => [...importedAssets, ...prev]);
            showToast(`Đã thêm thành công ${importedAssets.length} thiết bị từ file Excel vào Digital Twin!`);
          }
        }}
      />

      {/* Workspace Explicit Confirmation Dialog */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
