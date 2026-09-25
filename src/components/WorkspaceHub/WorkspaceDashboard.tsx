/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  HardDrive,
  Mail,
  Calendar,
  ClipboardList,
  Users,
  ExternalLink,
  RefreshCw,
  Send,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  FileText,
  FolderPlus,
  FolderCheck,
  FolderOpen,
  ArrowDownToLine,
  ArrowUpRight,
  Eye,
  Check,
  Search,
  Layers,
  Inbox,
  CalendarCheck
} from 'lucide-react';
import { Asset, QuantityItem } from '../../types';
import {
  listDriveCADFiles,
  uploadReportToDrive,
  downloadDriveFileText,
  initializeProjectDriveStorage,
  getStoredProjectDriveStorage,
  ProjectFolderStructure,
  createMasterSpreadsheet,
  importAssetsFromGoogleSheet,
  sendGmailNotification,
  listRecentGmailMessages,
  GmailMessageSummary,
  createMaintenanceCalendarEvent,
  listUpcomingCalendarEvents,
  createInspectionGoogleForm,
  getFormResponses,
  listMEPEngineerContacts,
  DriveFileItem,
  CalendarEventItem,
  ContactItem
} from '../../services/workspaceService';
import { ConfirmationModal } from '../ConfirmationModal';

interface WorkspaceDashboardProps {
  assets: Asset[];
  quantities: QuantityItem[];
  hasWorkspaceToken: boolean;
  onRequireAuth: () => void;
  onImportAssetsFromSheet?: (newAssets: Asset[]) => void;
  onOpenCADDrawingFromDrive?: (fileName: string, content: string) => void;
}

export const WorkspaceDashboard: React.FC<WorkspaceDashboardProps> = ({
  assets,
  quantities,
  hasWorkspaceToken,
  onRequireAuth,
  onImportAssetsFromSheet,
  onOpenCADDrawingFromDrive
}) => {
  const [activeTab, setActiveTab] = useState<'STORAGE' | 'SHEETS' | 'DRIVE' | 'GMAIL' | 'CALENDAR' | 'FORMS' | 'CONTACTS'>('STORAGE');

  // Confirmation modal state (Workspace skill explicit confirmation requirement)
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: async () => {}
  });

  // Project Folder Structure State
  const [folderStructure, setFolderStructure] = useState<ProjectFolderStructure | null>(null);
  const [isInitializingStorage, setIsInitializingStorage] = useState(false);

  // Drive state
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string>('ALL');

  // Sheets state
  const [createdSheetUrl, setCreatedSheetUrl] = useState<string | null>(null);
  const [inputSpreadsheetId, setInputSpreadsheetId] = useState<string>('');
  const [isImportingSheet, setIsImportingSheet] = useState(false);

  // Calendar state
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([]);
  const [calSummary, setCalSummary] = useState('Kiểm tra định kỳ Tủ điện MDB-A01 & AHU-02');
  const [calDesc, setCalDesc] = useState('Đo kiểm nhiệt độ tiếp xúc các điểm đấu nối và kiểm tra lưu lượng gió.');
  const [calDate, setCalDate] = useState('2026-09-28T09:00:00');

  // Gmail state
  const [gmailMessages, setGmailMessages] = useState<GmailMessageSummary[]>([]);
  const [emailTo, setEmailTo] = useState('vanhanhdienQT@gmail.com');
  const [emailSubject, setEmailSubject] = useState('Báo cáo Nghiệm thu Kỹ thuật CAD/MEP - Sân bay Tân Sơn Nhất');
  const [emailBody, setEmailBody] = useState(
    'Kính gửi Ban Quản lý Dự án Sân bay Quốc tế Tân Sơn Nhất,\n\nHệ thống AI Drawing Intelligence đã hoàn thành bóc tách khối lượng và đối chiếu hồ sơ thiết bị cho Ga T2/T3. Toàn bộ bản vẽ, bảng tính BOQ và hồ sơ kỹ thuật đã được đồng bộ 2 chiều lên Google Drive và Google Sheets.'
  );

  // Forms state
  const [createdFormUrl, setCreatedFormUrl] = useState<string | null>(null);
  const [formResponses, setFormResponses] = useState<any[]>([]);

  // Contacts state
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [contactSearch, setContactSearch] = useState('');

  // General loading & alert state
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load stored folder structure on mount
  useEffect(() => {
    const stored = getStoredProjectDriveStorage();
    if (stored) {
      setFolderStructure(stored);
    }
  }, []);

  // Fetch initial data when authenticated
  useEffect(() => {
    if (hasWorkspaceToken) {
      if (activeTab === 'DRIVE' || activeTab === 'STORAGE') fetchDriveFiles();
      if (activeTab === 'CALENDAR') fetchCalendarEvents();
      if (activeTab === 'GMAIL') fetchGmailMessages();
      if (activeTab === 'CONTACTS') fetchContacts();
    }
  }, [hasWorkspaceToken, activeTab, selectedFolderFilter]);

  const fetchDriveFiles = async () => {
    setIsLoading(true);
    try {
      let folderId: string | undefined = undefined;
      if (selectedFolderFilter === 'DRAWINGS' && folderStructure?.drawingsFolderId) {
        folderId = folderStructure.drawingsFolderId;
      } else if (selectedFolderFilter === 'REPORTS' && folderStructure?.reportsFolderId) {
        folderId = folderStructure.reportsFolderId;
      } else if (selectedFolderFilter === 'DOSSIERS' && folderStructure?.dossiersFolderId) {
        folderId = folderStructure.dossiersFolderId;
      } else if (selectedFolderFilter === 'LOGS' && folderStructure?.logsFolderId) {
        folderId = folderStructure.logsFolderId;
      }

      const files = await listDriveCADFiles(folderId);
      setDriveFiles(files);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Lỗi đọc Google Drive' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCalendarEvents = async () => {
    setIsLoading(true);
    try {
      const list = await listUpcomingCalendarEvents(10);
      setCalendarEvents(list);
    } catch (err: any) {
      console.warn('Calendar fetch:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGmailMessages = async () => {
    setIsLoading(true);
    try {
      const msgs = await listRecentGmailMessages(6);
      setGmailMessages(msgs);
    } catch (err: any) {
      console.warn('Gmail fetch:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const list = await listMEPEngineerContacts();
      setContacts(list);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Lỗi đọc Google Contacts' });
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Initialize / Pre-create Dedicated Project Folders on Google Drive
  const triggerInitializeStorage = () => {
    if (!hasWorkspaceToken) {
      onRequireAuth();
      return;
    }

    setConfirmState({
      isOpen: true,
      title: 'Tạo sẵn Thư mục Lưu trữ Dự án trên Google Drive?',
      message: `Hệ thống sẽ kiểm tra và tạo mới thư mục gốc "Tân Sơn Nhất - CAD MEP Digital Twin" cùng 4 thư mục con chuyên biệt trên tài khoản Google Drive của bạn:\n• 01_Ban_Ve_CAD_PDF (Bản vẽ CAD/PDF)\n• 02_Bao_Cao_Tien_Do_BOQ (Bảng tính Sheets & BOQ)\n• 03_Ho_So_Ky_Thuat_Dossier (Tài liệu kỹ thuật thiết bị)\n• 04_Nhat_Ky_Hien_Truong_Log (Nhật ký khảo sát hiện trường)`,
      action: async () => {
        setIsInitializingStorage(true);
        setStatusMessage(null);
        try {
          const struct = await initializeProjectDriveStorage();
          setFolderStructure(struct);
          setStatusMessage({
            type: 'success',
            text: 'Đã tạo và kết nối thành công cấu trúc thư mục lưu trữ dự án trên Google Drive!'
          });
          fetchDriveFiles();
        } catch (err: any) {
          setStatusMessage({ type: 'error', text: err.message || 'Lỗi tạo thư mục trên Drive' });
        } finally {
          setIsInitializingStorage(false);
        }
      }
    });
  };

  // 2. Google Sheets: Export (Direction 1)
  const triggerSyncSheets = () => {
    if (!hasWorkspaceToken) {
      onRequireAuth();
      return;
    }

    setConfirmState({
      isOpen: true,
      title: 'Xác nhận Đồng bộ Bảng tính Master sang Google Sheets?',
      message: `Hệ thống sẽ tạo file Google Spreadsheet mới trong thư mục "02_Bao_Cao_Tien_Do_BOQ" với 4 tab hoàn chỉnh:\n• TIEN_DO_CONG_VIEC\n• VI_TRI_THIET_BI_PHONG (${assets.length} thiết bị)\n• BOC_TACH_KHOI_LUONG_BOQ (${quantities.length} hạng mục)\n• NHAT_KY_HOAT_DONG_LOG`,
      action: async () => {
        setIsLoading(true);
        setStatusMessage(null);
        try {
          const result = await createMasterSpreadsheet(
            `TSN_T2_CAD_MEP_Master_${new Date().toISOString().slice(0, 10)}`,
            assets,
            quantities
          );
          setCreatedSheetUrl(result.url);
          setInputSpreadsheetId(result.spreadsheetId);
          setStatusMessage({
            type: 'success',
            text: `Đồng bộ Google Sheets thành công! ID: ${result.spreadsheetId}`
          });
        } catch (err: any) {
          setStatusMessage({ type: 'error', text: err.message || 'Không thể đồng bộ Google Sheets' });
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  // 3. Google Sheets: Two-Way Import back into App (Direction 2)
  const triggerImportFromSheet = async () => {
    if (!hasWorkspaceToken) {
      onRequireAuth();
      return;
    }

    const targetId = inputSpreadsheetId.trim();
    if (!targetId) {
      setStatusMessage({ type: 'error', text: 'Vui lòng nhập Google Spreadsheet ID hoặc chọn file bảng tính.' });
      return;
    }

    setIsImportingSheet(true);
    setStatusMessage(null);
    try {
      const importedAssets = await importAssetsFromGoogleSheet(targetId);
      if (onImportAssetsFromSheet) {
        onImportAssetsFromSheet(importedAssets);
      }
      setStatusMessage({
        type: 'success',
        text: `Đồng bộ 2 chiều thành công! Đã nạp ${importedAssets.length} thiết bị trực tiếp từ Google Sheets.`
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Lỗi đồng bộ dữ liệu từ Sheet' });
    } finally {
      setIsImportingSheet(false);
    }
  };

  // 4. Google Drive: Upload file to folder
  const triggerUploadDrive = (targetFolderId?: string) => {
    if (!hasWorkspaceToken) {
      onRequireAuth();
      return;
    }

    setConfirmState({
      isOpen: true,
      title: 'Tải Báo Cáo Kỹ Thuật lên Google Drive?',
      message: `Hệ thống sẽ lưu file "BaoCao_KiemDinh_CAD_MEP_${new Date().toISOString().slice(0, 10)}.txt" vào thư mục dự án trên Google Drive.`,
      action: async () => {
        setIsLoading(true);
        setStatusMessage(null);
        try {
          const reportContent = `BÁO CÁO HỒ SƠ THIẾT BỊ & KHỐI LƯỢNG MEP - SÂN BAY QUỐC TẾ TÂN SƠN NHẤT\nThời gian: ${new Date().toLocaleString()}\nTổng số thiết bị quản lý: ${assets.length}\nTổng hạng mục bóc tách BOQ: ${quantities.length}\nCấu trúc thư mục: Tân Sơn Nhất - CAD MEP Digital Twin\nTrạng thái nghiệm thu: Đạt tiêu chuẩn kỹ thuật.`;
          await uploadReportToDrive(
            `BaoCao_KiemDinh_CAD_MEP_${new Date().toISOString().slice(0, 10)}.txt`,
            reportContent,
            'text/plain',
            targetFolderId || folderStructure?.reportsFolderId
          );
          setStatusMessage({ type: 'success', text: 'Tải báo cáo lên Google Drive thành công!' });
          fetchDriveFiles();
        } catch (err: any) {
          setStatusMessage({ type: 'error', text: err.message || 'Không thể tải lên Drive' });
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  // 5. Open drawing from Drive in CAD Viewer
  const handleOpenDrawingInCAD = async (file: DriveFileItem) => {
    try {
      setIsLoading(true);
      const textContent = await downloadDriveFileText(file.id);
      if (onOpenCADDrawingFromDrive) {
        onOpenCADDrawingFromDrive(file.name, textContent);
      }
      setStatusMessage({
        type: 'success',
        text: `Đã nạp file bản vẽ "${file.name}" từ Google Drive sang CAD Viewer!`
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Lỗi đọc file từ Drive: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Send Gmail with explicit confirmation
  const triggerSendEmail = () => {
    if (!hasWorkspaceToken) {
      onRequireAuth();
      return;
    }

    setConfirmState({
      isOpen: true,
      title: 'Xác nhận Gửi Email qua Gmail?',
      message: `Bạn chuẩn bị gửi email trực tiếp từ hòm thư Gmail của mình:\n• Đến: ${emailTo}\n• Tiêu đề: "${emailSubject}"`,
      action: async () => {
        setIsLoading(true);
        setStatusMessage(null);
        try {
          await sendGmailNotification(emailTo, emailSubject, emailBody);
          setStatusMessage({ type: 'success', text: `Đã gửi email thành công đến ${emailTo}!` });
          fetchGmailMessages();
        } catch (err: any) {
          setStatusMessage({ type: 'error', text: err.message || 'Lỗi gửi email Gmail' });
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  // 7. Create Calendar Event with explicit confirmation
  const triggerCreateCalendar = () => {
    if (!hasWorkspaceToken) {
      onRequireAuth();
      return;
    }

    setConfirmState({
      isOpen: true,
      title: 'Xác nhận Tạo Lịch Kiểm Tra (Google Calendar)?',
      message: `Lên lịch sự kiện: "${calSummary}"\nThời gian: ${calDate.replace('T', ' ')}\nĐịa điểm: Nhà ga T2 - Sân bay Quốc tế Tân Sơn Nhất.`,
      action: async () => {
        setIsLoading(true);
        setStatusMessage(null);
        try {
          const startIso = new Date(calDate).toISOString();
          const endIso = new Date(new Date(calDate).getTime() + 60 * 60 * 1000).toISOString();
          await createMaintenanceCalendarEvent({
            summary: calSummary,
            description: calDesc,
            start: { dateTime: startIso, timeZone: 'Asia/Ho_Chi_Minh' },
            end: { dateTime: endIso, timeZone: 'Asia/Ho_Chi_Minh' },
            location: 'Nhà ga T2 - Sân bay Quốc tế Tân Sơn Nhất'
          });
          setStatusMessage({ type: 'success', text: 'Đã lên lịch bảo trì trên Google Calendar thành công!' });
          fetchCalendarEvents();
        } catch (err: any) {
          setStatusMessage({ type: 'error', text: err.message || 'Lỗi tạo lịch Calendar' });
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  // 8. Create Google Form with explicit confirmation
  const triggerCreateForm = () => {
    if (!hasWorkspaceToken) {
      onRequireAuth();
      return;
    }

    setConfirmState({
      isOpen: true,
      title: 'Xác nhận Tạo Phiếu Khảo Sát (Google Forms)?',
      message: `Tạo biểu mẫu Google Forms trực tuyến phục vụ kiểm định hiện trường với ${assets.length} thiết bị từ cơ sở dữ liệu CAD Tân Sơn Nhất.`,
      action: async () => {
        setIsLoading(true);
        setStatusMessage(null);
        try {
          const result = await createInspectionGoogleForm(
            'Phiếu Kiểm Tra Hiện Trường Thiết Bị MEP Tân Sơn Nhất',
            assets.map(a => a.assetTag)
          );
          setCreatedFormUrl(result.responderUri);
          setStatusMessage({ type: 'success', text: 'Tạo Google Form khảo sát thành công!' });
        } catch (err: any) {
          setStatusMessage({ type: 'error', text: err.message || 'Lỗi tạo Google Form' });
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const filteredContacts = contacts.filter(c => {
    if (!contactSearch.trim()) return true;
    const q = contactSearch.toLowerCase();
    return (
      c.displayName.toLowerCase().includes(q) ||
      (c.jobTitle && c.jobTitle.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Trung tâm Tích hợp Hệ sinh thái Google Workspace</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Đồng bộ 2 Chiều Trực tiếp
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Quản lý đồng bộ 2 chiều với Google Drive, Google Sheets, Gmail, Google Calendar, Google Forms và Contacts kèm cấu trúc thư mục lưu trữ tự động.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {!hasWorkspaceToken ? (
            <button
              onClick={onRequireAuth}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition"
            >
              Đăng nhập Google Workspace
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-950/60 border border-emerald-500/40 rounded-lg text-xs text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Đã kết nối Tài khoản Google</span>
            </div>
          )}
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-3 text-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span className="flex-1 font-medium">{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Prominent Section: Google Drive Dedicated Folder Structure */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-xl">
              <FolderCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Cấu trúc Thư mục Lưu trữ Dự án trên Google Drive</span>
                {folderStructure ? (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Đã Khởi Tạo
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Sẵn Sàng Khởi Tạo
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Thư mục gốc <span className="text-sky-300 font-mono font-medium">Tân Sơn Nhất - CAD MEP Digital Twin</span> và 4 phân vùng lưu trữ chuyên biệt.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={triggerInitializeStorage}
              disabled={isInitializingStorage}
              className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg transition"
            >
              <FolderPlus className={`w-4 h-4 ${isInitializingStorage ? 'animate-spin' : ''}`} />
              <span>{isInitializingStorage ? 'Đang tạo thư mục...' : 'Tạo sẵn & Đồng bộ Thư mục Drive'}</span>
            </button>

            {folderStructure && (
              <a
                href={folderStructure.rootFolderUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <span>Mở thư mục gốc</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* 4 Dedicated Subfolders Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>01_Ban_Ve_CAD_PDF</span>
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            </div>
            <p className="text-[11px] text-slate-400">
              Lưu trữ bản vẽ DWG, DXF, PDF mặt bằng các tầng nhà ga T2/T3.
            </p>
            {folderStructure?.drawingsFolderUrl && (
              <a
                href={folderStructure.drawingsFolderUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium pt-1"
              >
                <span>Truy cập thư mục</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>02_Bao_Cao_Tien_Do_BOQ</span>
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            </div>
            <p className="text-[11px] text-slate-400">
              Bảng tính Google Sheets bóc tách khối lượng BOQ và tiến độ.
            </p>
            {folderStructure?.reportsFolderUrl && (
              <a
                href={folderStructure.reportsFolderUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium pt-1"
              >
                <span>Truy cập thư mục</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>03_Ho_So_Ky_Thuat_Dossier</span>
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            </div>
            <p className="text-[11px] text-slate-400">
              Hồ sơ lý lịch thiết bị, nameplate và One-Click Technical Dossiers.
            </p>
            {folderStructure?.dossiersFolderUrl && (
              <a
                href={folderStructure.dossiersFolderUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium pt-1"
              >
                <span>Truy cập thư mục</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>04_Nhat_Ky_Hien_Truong_Log</span>
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            </div>
            <p className="text-[11px] text-slate-400">
              Nhật ký hiện trường, log giọng nói AI và biên bản kiểm định.
            </p>
            {folderStructure?.logsFolderUrl && (
              <a
                href={folderStructure.logsFolderUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium pt-1"
              >
                <span>Truy cập thư mục</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Workspace Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'DRIVE', label: 'Google Drive (2 Chiều)', icon: HardDrive, color: 'text-sky-400' },
          { id: 'SHEETS', label: 'Google Sheets (2 Chiều)', icon: FileSpreadsheet, color: 'text-emerald-400' },
          { id: 'CALENDAR', label: 'Google Calendar (2 Chiều)', icon: Calendar, color: 'text-amber-400' },
          { id: 'GMAIL', label: 'Gmail Dispatch (2 Chiều)', icon: Mail, color: 'text-rose-400' },
          { id: 'FORMS', label: 'Google Forms', icon: ClipboardList, color: 'text-purple-400' },
          { id: 'CONTACTS', label: 'Danh bạ Kỹ sư', icon: Users, color: 'text-indigo-400' }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition ${
                isActive
                  ? 'bg-slate-800 border-indigo-500 text-white shadow-md'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${tab.color}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        {/* TAB 1: GOOGLE DRIVE (2-WAY) */}
        {activeTab === 'DRIVE' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Kho Dữ liệu & Bản vẽ Google Drive (Đồng bộ 2 chiều)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Tải lên tài liệu hoặc chọn bản vẽ trực tiếp từ Google Drive để nạp vào CAD Viewer và phân tích AI.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchDriveFiles}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs border border-slate-700 transition"
                  title="Làm mới danh sách Drive"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>

                <button
                  onClick={() => triggerUploadDrive()}
                  className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tải Báo cáo lên Drive</span>
                </button>
              </div>
            </div>

            {/* Folder Filter Selector */}
            <div className="flex items-center gap-2 pt-1 pb-2">
              <span className="text-xs text-slate-400">Lọc theo thư mục:</span>
              {[
                { id: 'ALL', label: 'Tất cả file CAD/PDF' },
                { id: 'DRAWINGS', label: '01_Ban_Ve_CAD_PDF' },
                { id: 'REPORTS', label: '02_Bao_Cao_Tien_Do_BOQ' },
                { id: 'DOSSIERS', label: '03_Ho_So_Ky_Thuat_Dossier' },
                { id: 'LOGS', label: '04_Nhat_Ky_Hien_Truong_Log' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFolderFilter(f.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition ${
                    selectedFolderFilter === f.id
                      ? 'bg-sky-600/30 border-sky-500 text-sky-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Drive Files List with 2-way actions */}
            <div className="divide-y divide-slate-800 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
              {driveFiles.length > 0 ? (
                driveFiles.map(file => (
                  <div key={file.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-900/60">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-white">{file.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {file.mimeType} • {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {(file.name.endsWith('.dxf') || file.name.endsWith('.dwg') || file.name.endsWith('.pdf')) && (
                        <button
                          onClick={() => handleOpenDrawingInCAD(file)}
                          className="px-2.5 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                          title="Nạp trực tiếp vào CAD Viewer của ứng dụng"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Mở trên CAD Viewer</span>
                        </button>
                      )}

                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs flex items-center gap-1 font-medium transition"
                        >
                          <span>Mở trên Drive</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  {isLoading ? 'Đang nạp danh sách file từ Google Drive...' : 'Không tìm thấy file nào trong thư mục này hoặc chưa cấp quyền Drive.'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: GOOGLE SHEETS (2-WAY) */}
        {activeTab === 'SHEETS' && (
          <div className="space-y-6">
            {/* Direction 1: Export to Google Sheets */}
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Chiều 1: App ➔ Google Sheets
                    </span>
                    <span>Tạo mới Bảng tính Master TSN & Đồng bộ 4 Tabs</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Xuất toàn bộ {assets.length} thiết bị và {quantities.length} hạng mục bóc tách BOQ sang file Google Spreadsheet mới trong thư mục <code className="text-emerald-300">02_Bao_Cao_Tien_Do_BOQ</code>.
                  </p>
                </div>

                <button
                  onClick={triggerSyncSheets}
                  disabled={isLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs flex items-center gap-2 shadow transition whitespace-nowrap self-start sm:self-auto"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{isLoading ? 'Đang xuất Sheet...' : 'Xuất Master Google Sheets'}</span>
                </button>
              </div>

              {createdSheetUrl && (
                <div className="p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between gap-2">
                  <div className="truncate">
                    <div className="text-xs font-bold text-emerald-300">File Google Sheets đã sẵn sàng!</div>
                    <div className="text-[11px] text-slate-400 truncate">{createdSheetUrl}</div>
                  </div>
                  <a
                    href={createdSheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow shrink-0"
                  >
                    <span>Mở Google Sheets</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Direction 2: Two-Way Import from Google Sheets */}
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    Chiều 2: Google Sheets ➔ App
                  </span>
                  <span>Đọc & Cập nhật Dữ liệu Ngược lại từ Google Sheets (2 Chiều)</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Đọc danh mục thiết bị đã hiệu chỉnh từ tab <code className="text-sky-300">VI_TRI_THIET_BI_PHONG</code> trên Google Sheets và nạp ngược lại vào hệ thống Digital Twin.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <input
                  type="text"
                  placeholder="Dán Google Spreadsheet ID (ví dụ: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms)"
                  value={inputSpreadsheetId}
                  onChange={e => setInputSpreadsheetId(e.target.value)}
                  className="w-full flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />

                <button
                  onClick={triggerImportFromSheet}
                  disabled={isImportingSheet}
                  className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-2 shadow transition whitespace-nowrap"
                >
                  <RefreshCw className={`w-4 h-4 ${isImportingSheet ? 'animate-spin' : ''}`} />
                  <span>{isImportingSheet ? 'Đang đọc Sheet...' : 'Đồng bộ 2 Chiều từ Sheet'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: GOOGLE CALENDAR (2-WAY) */}
        {activeTab === 'CALENDAR' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Lên lịch */}
              <div className="lg:col-span-5 space-y-3 p-5 bg-slate-950 border border-slate-800 rounded-xl">
                <div>
                  <h4 className="text-sm font-bold text-white">Tạo Lịch Kiểm Định & Bảo Trì Mới</h4>
                  <p className="text-xs text-slate-400">
                    Lên lịch trực tiếp vào Google Calendar chính của kỹ sư MEP.
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Tên công việc kiểm định</label>
                    <input
                      type="text"
                      value={calSummary}
                      onChange={e => setCalSummary(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Thời gian bắt đầu</label>
                    <input
                      type="datetime-local"
                      value={calDate}
                      onChange={e => setCalDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Mô tả công việc</label>
                    <textarea
                      rows={3}
                      value={calDesc}
                      onChange={e => setCalDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button
                    onClick={triggerCreateCalendar}
                    disabled={isLoading}
                    className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold flex items-center justify-center gap-1.5 shadow transition"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Lên Lịch trên Google Calendar</span>
                  </button>
                </div>
              </div>

              {/* Danh sách Sự kiện Lịch hiện tại từ Google Calendar (Chiều 2) */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-amber-400" />
                    <span>Sự kiện Bảo trì Sắp tới từ Google Calendar</span>
                  </h4>
                  <button
                    onClick={fetchCalendarEvents}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                    title="Làm mới lịch"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {calendarEvents.length > 0 ? (
                    calendarEvents.map((evt, idx) => (
                      <div key={idx} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-sm">{evt.summary}</span>
                          <span className="text-[11px] text-amber-400 font-mono">
                            {evt.start.dateTime ? new Date(evt.start.dateTime).toLocaleString() : ''}
                          </span>
                        </div>
                        {evt.description && <div className="text-slate-400 text-[11px]">{evt.description}</div>}
                        {evt.location && <div className="text-slate-500 text-[10px]">📍 {evt.location}</div>}
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs bg-slate-950 border border-slate-800 rounded-xl">
                      {isLoading ? 'Đang đồng bộ sự kiện từ Google Calendar...' : 'Không có sự kiện lịch sắp tới nào hoặc chưa có lịch bảo trì.'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: GMAIL (2-WAY) */}
        {activeTab === 'GMAIL' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Soạn thư gửi */}
              <div className="lg:col-span-6 space-y-3 p-5 bg-slate-950 border border-slate-800 rounded-xl">
                <div>
                  <h4 className="text-sm font-bold text-white">Soạn & Gửi Báo Cáo Kỹ Thuật (Gmail API)</h4>
                  <p className="text-xs text-slate-400">
                    Gửi cảnh báo sự cố hoặc thông báo nghiệm thu từ tài khoản Gmail của bạn.
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Người nhận (Email)</label>
                    <input
                      type="email"
                      value={emailTo}
                      onChange={e => setEmailTo(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Tiêu đề (Subject)</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={e => setEmailSubject(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Nội dung thư</label>
                    <textarea
                      rows={5}
                      value={emailBody}
                      onChange={e => setEmailBody(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button
                    onClick={triggerSendEmail}
                    disabled={isLoading}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow transition"
                  >
                    <Send className="w-4 h-4" />
                    <span>Gửi thư qua Gmail</span>
                  </button>
                </div>
              </div>

              {/* Hòm thư / Email gần đây (Chiều 2) */}
              <div className="lg:col-span-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Inbox className="w-4 h-4 text-rose-400" />
                    <span>Hộp Thư Gmail - Tin Nhắn Kỹ Thuật Gần Đây</span>
                  </h4>
                  <button
                    onClick={fetchGmailMessages}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                    title="Làm mới Gmail"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {gmailMessages.length > 0 ? (
                    gmailMessages.map(msg => (
                      <div key={msg.id} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white truncate max-w-[280px]">{msg.subject}</span>
                          <span className="text-[10px] text-slate-400">{msg.date}</span>
                        </div>
                        <div className="text-[11px] text-rose-300 font-medium">Từ: {msg.from}</div>
                        <div className="text-slate-400 text-[11px] line-clamp-2">{msg.snippet}</div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs bg-slate-950 border border-slate-800 rounded-xl">
                      {isLoading ? 'Đang đồng bộ hộp thư Gmail...' : 'Chưa có email kỹ thuật nào hoặc chưa đồng bộ.'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: FORMS */}
        {activeTab === 'FORMS' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">Tạo Phiếu Kiểm Tra Hiện Trường (Google Forms)</h3>
                <p className="text-xs text-slate-400">
                  Tự động sinh Form khảo sát hiện trường với danh mục thiết bị từ cơ sở dữ liệu CAD Tân Sơn Nhất.
                </p>
              </div>

              <button
                onClick={triggerCreateForm}
                disabled={isLoading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition self-start sm:self-auto"
              >
                <ClipboardList className="w-4 h-4" />
                <span>Tạo Google Form Mới</span>
              </button>
            </div>

            {createdFormUrl ? (
              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-purple-300">Biểu mẫu khảo sát đã được tạo thành công</div>
                  <div className="text-[11px] text-slate-400 truncate max-w-md">{createdFormUrl}</div>
                </div>
                <a
                  href={createdFormUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
                >
                  <span>Mở Biểu Mẫu Google Form</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
                Bấm "Tạo Google Form Mới" để kích hoạt biểu mẫu trực tuyến cho kỹ sư đi kiểm tra ngoài hiện trường.
              </div>
            )}
          </div>
        )}

        {/* TAB 6: CONTACTS */}
        {activeTab === 'CONTACTS' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">Danh bạ Kỹ sư Phụ trách (Google Contacts)</h3>
                <p className="text-xs text-slate-400">
                  Tra cứu nhanh thông tin kỹ sư trưởng, nhà thầu MEP và đơn vị bảo dưỡng từ Google Contacts.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên, email, chức vụ..."
                    value={contactSearch}
                    onChange={e => setContactSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  onClick={fetchContacts}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs border border-slate-700 transition"
                  title="Làm mới danh bạ"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredContacts.length > 0 ? (
                filteredContacts.map((c, i) => (
                  <div key={i} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1.5 hover:border-slate-700 transition">
                    <div className="font-bold text-white text-sm">{c.displayName}</div>
                    <div className="text-[11px] text-indigo-400 font-medium">{c.jobTitle}</div>
                    {c.email && (
                      <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-rose-400" />
                        <a href={`mailto:${c.email}`} className="hover:underline hover:text-white">
                          {c.email}
                        </a>
                      </div>
                    )}
                    {c.phone && (
                      <div className="text-slate-400 text-[11px]">
                        📞 {c.phone}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="col-span-3 p-8 text-center text-slate-400 text-xs bg-slate-950 border border-slate-800 rounded-xl">
                  {isLoading ? 'Đang đồng bộ danh bạ từ Google Contacts...' : 'Không tìm thấy liên hệ nào trong danh bạ Google.'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Explicit Confirmation Dialog per Workspace Skill */}
      <ConfirmationModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={async () => {
          setConfirmState(prev => ({ ...prev, isOpen: false }));
          await confirmState.action();
        }}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
