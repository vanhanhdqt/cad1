/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getAccessToken } from './firebaseAuth';
import { Asset, QuantityItem } from '../types';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface ProjectFolderStructure {
  rootFolderId: string;
  rootFolderName: string;
  rootFolderUrl: string;
  drawingsFolderId: string;
  drawingsFolderUrl: string;
  reportsFolderId: string;
  reportsFolderUrl: string;
  dossiersFolderId: string;
  dossiersFolderUrl: string;
  logsFolderId: string;
  logsFolderUrl: string;
  lastSyncedAt: string;
}

export interface CalendarEventItem {
  id?: string;
  summary: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: string;
}

export interface ContactItem {
  resourceName: string;
  displayName: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
}

export interface GmailMessageSummary {
  id: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
}

const getHeaders = async () => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Chưa đăng nhập Google Workspace. Vui lòng nhấn Đăng nhập Google.');
  }
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

/**
 * 1. Google Drive API - Two-way & Project Storage Structure
 */
export const listDriveCADFiles = async (folderId?: string): Promise<DriveFileItem[]> => {
  const headers = await getHeaders();
  let query = "trashed = false and (name contains '.dxf' or name contains '.dwg' or name contains '.pdf' or name contains '.xlsx' or mimeType = 'application/pdf' or mimeType = 'application/vnd.google-apps.spreadsheet')";
  if (folderId) {
    query = `'${folderId}' in parents and trashed = false`;
  }
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,modifiedTime,webViewLink)&pageSize=30`, {
    headers
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Lỗi truy xuất Drive: ${response.statusText}`);
  }
  const data = await response.json();
  return data.files || [];
};

export const findOrCreateDriveFolder = async (folderName: string, parentId?: string): Promise<{ id: string; name: string; webViewLink: string }> => {
  const headers = await getHeaders();
  let query = `trashed = false and mimeType = 'application/vnd.google-apps.folder' and name = '${folderName.replace(/'/g, "\\'")}'`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,webViewLink)`, { headers });
  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return {
        id: searchData.files[0].id,
        name: searchData.files[0].name,
        webViewLink: searchData.files[0].webViewLink || `https://drive.google.com/drive/folders/${searchData.files[0].id}`
      };
    }
  }

  // Create folder
  const meta: Record<string, any> = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };
  if (parentId) meta.parents = [parentId];

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method: 'POST',
    headers,
    body: JSON.stringify(meta)
  });
  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Không thể tạo thư mục ${folderName} trên Drive`);
  }
  const created = await createRes.json();
  return {
    id: created.id,
    name: created.name || folderName,
    webViewLink: created.webViewLink || `https://drive.google.com/drive/folders/${created.id}`
  };
};

export const initializeProjectDriveStorage = async (): Promise<ProjectFolderStructure> => {
  // 1. Root folder
  const root = await findOrCreateDriveFolder('Tân Sơn Nhất - CAD MEP Digital Twin');

  // 2. Subfolders
  const drawings = await findOrCreateDriveFolder('01_Ban_Ve_CAD_PDF', root.id);
  const reports = await findOrCreateDriveFolder('02_Bao_Cao_Tien_Do_BOQ', root.id);
  const dossiers = await findOrCreateDriveFolder('03_Ho_So_Ky_Thuat_Dossier', root.id);
  const logs = await findOrCreateDriveFolder('04_Nhat_Ky_Hien_Truong_Log', root.id);

  const structure: ProjectFolderStructure = {
    rootFolderId: root.id,
    rootFolderName: root.name,
    rootFolderUrl: root.webViewLink,
    drawingsFolderId: drawings.id,
    drawingsFolderUrl: drawings.webViewLink,
    reportsFolderId: reports.id,
    reportsFolderUrl: reports.webViewLink,
    dossiersFolderId: dossiers.id,
    dossiersFolderUrl: dossiers.webViewLink,
    logsFolderId: logs.id,
    logsFolderUrl: logs.webViewLink,
    lastSyncedAt: new Date().toLocaleString()
  };

  try {
    localStorage.setItem('TSN_PROJECT_DRIVE_STORAGE', JSON.stringify(structure));
  } catch (e) {
    // Ignore localStorage error
  }

  return structure;
};

export const getStoredProjectDriveStorage = (): ProjectFolderStructure | null => {
  try {
    const raw = localStorage.getItem('TSN_PROJECT_DRIVE_STORAGE');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
};

export const uploadReportToDrive = async (
  fileName: string,
  content: string,
  mimeType = 'text/plain',
  folderId?: string
): Promise<DriveFileItem> => {
  const headers = await getHeaders();
  const boundary = 'foo_bar_baz';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const metadata: Record<string, any> = {
    name: fileName,
    mimeType: mimeType
  };
  if (folderId) {
    metadata.parents = [folderId];
  }

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n` +
    content +
    closeDelim;

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: headers.Authorization,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartRequestBody
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Không thể tải file lên Drive');
  }
  return await res.json();
};

export const downloadDriveFileText = async (fileId: string): Promise<string> => {
  const headers = await getHeaders();
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: headers.Authorization }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Không thể tải nội dung file từ Drive: ${res.statusText}`);
  }
  return await res.text();
};

/**
 * 2. Google Sheets API - Comprehensive Project & Digital Twin Tracking
 */
export const createMasterSpreadsheet = async (
  title: string,
  assets: Asset[],
  quantities: QuantityItem[],
  auditLogs?: any[]
): Promise<{ spreadsheetId: string; url: string }> => {
  const headers = await getHeaders();

  // Create empty spreadsheet with 4 tabs per user specification:
  // 1. TIEN_DO_CONG_VIEC
  // 2. VI_TRI_THIET_BI_PHONG
  // 3. BOC_TACH_KHOI_LUONG_BOQ
  // 4. NHAT_KY_HOAT_DONG_LOG
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      properties: { title },
      sheets: [
        { properties: { title: 'TIEN_DO_CONG_VIEC' } },
        { properties: { title: 'VI_TRI_THIET_BI_PHONG' } },
        { properties: { title: 'BOC_TACH_KHOI_LUONG_BOQ' } },
        { properties: { title: 'NHAT_KY_HOAT_DONG_LOG' } }
      ]
    })
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Không thể tạo Google Sheet');
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const url = sheetData.spreadsheetUrl;

  // 1. TIEN_DO_CONG_VIEC Headers and Data
  const progressHeaders = ['Mã Công Việc', 'Hạng Mục Khảo Sát', 'Khu Vực / Phòng', 'Hệ Thống', 'Tỷ Lệ Hoàn Thành', 'Trạng Thái', 'Kỹ Sư Phụ Trách', 'Hạn Định Nghiệm Thu', 'Ghi Chú'];
  const progressRows = [
    ['CV-01', 'Khảo sát & Nghiệm thu Tủ điện MDB & Trục cáp', 'Phòng E-101 (Tầng 1)', 'ELECTRICAL', '100%', 'ĐÃ NGHIỆM THU', 'KS. Nguyễn Văn Hậu', '2026-09-20', 'Đã đối chiếu tọa độ CAD'],
    ['CV-02', 'Đo đạc kiểm tra Phòng máy AHU-02 & Ống gió', 'AHU-RM-02 (Tầng 1)', 'HVAC', '90%', 'ĐANG THỰC HIỆN', 'KS. Trần Đình Trọng', '2026-09-28', 'Kiểm tra lưu lượng 28,000 m3/h'],
    ['CV-03', 'Kiểm tra tải động Thang cuốn ES-01 & Thang máy EL-01', 'Sảnh Đến Concourse A', 'ARCHITECTURE', '95%', 'HOÀN THÀNH', 'KS. Lê Hoàng Long', '2026-09-25', 'Vận hành êm, an toàn tuyệt đối'],
    ['CV-04', 'Thử áp lực đường ống Trạm bơm PCCC FP-01', 'Trạm Bơm PR-01 (Basement)', 'FIRE_PROTECTION', '100%', 'ĐÃ NGHIỆM THU', 'Đội PCCC Tân Sơn Nhất', '2026-09-15', 'Áp lực đạt 11.2 bar'],
    ['CV-05', 'Kiểm tra hệ thống cấp thoát nước Khu Nhà vệ sinh WC-A01', 'Khu WC Sảnh A', 'PLUMBING', '85%', 'ĐANG KIỂM ĐỊNH', 'KS. Võ Minh Tuấn', '2026-10-02', 'Đấu nối hoàn tất']
  ];

  // 2. VI_TRI_THIET_BI_PHONG (Tủ điện, thang cuốn, thang máy, WC, phòng máy, phòng bơm)
  const assetHeaders = [
    'Mã Định Danh (Tag)',
    'Tên Thiết Bị / Phòng',
    'Phân Loại',
    'Hệ Thống',
    'Tầng',
    'Phân Khu (Zone)',
    'Phòng / Không Gian',
    'Tọa Độ CAD X (mm)',
    'Tọa Độ CAD Y (mm)',
    'Tọa Độ CAD Z (mm)',
    'Hãng Sản Xuất / Tiêu Chuẩn',
    'Dòng Model',
    'Trạng Thái',
    'Độ Tin Cậy AI',
    'Bản Vẽ Nguồn',
    'Phiên Bản As-built'
  ];

  const assetRows = assets.map(a => [
    a.assetTag,
    a.assetName,
    a.assetType,
    a.system,
    a.floor,
    a.zone,
    a.room,
    a.cadCoordinates.x,
    a.cadCoordinates.y,
    a.cadCoordinates.z || 0,
    a.manufacturer,
    a.model,
    a.status,
    `${Math.round(a.confidence * 100)}%`,
    a.sourceDrawing,
    a.sourceRevision
  ]);

  // 3. BOC_TACH_KHOI_LUONG_BOQ
  const qtyHeaders = [
    'Mã Dự Toán (Item Code)',
    'Mô Tả Chi Tiết Hạng Mục',
    'Hệ Thống',
    'Tầng',
    'Phòng',
    'Đơn Vị',
    'Khối Lượng Bóc Tách',
    'Công Thức Toán Học',
    'Phương Pháp Đo',
    'Độ Tin Cậy',
    'Trạng Thái Nghiệm Thu',
    'Thực Thể CAD Nguồn (Handles)'
  ];

  const qtyRows = quantities.map(q => [
    q.itemCode,
    q.description,
    q.system,
    q.floor,
    q.room || '',
    q.unit,
    q.quantity,
    q.formula,
    q.measurementMethod,
    `${Math.round(q.confidence * 100)}%`,
    q.status,
    q.sourceEntities.join(', ')
  ]);

  // 4. NHAT_KY_HOAT_DONG_LOG
  const logHeaders = ['Mã Log', 'Thời Điểm (Timestamp)', 'Người Thực Hiện', 'Hành Động', 'Đối Tượng Tác Động', 'Chi Tiết Thay Đổi'];
  const logRows = (auditLogs || [
    ['LOG-001', '2026-09-24 17:35', 'KS. Hệ thống AI', 'AI_ANALYZE', 'Bản vẽ TSN-T2-MEP-E-01', 'Nhận diện tự động 5 thiết bị và 4 phòng máy trọng yếu'],
    ['LOG-002', '2026-09-24 17:38', 'KS. Nguyễn Văn Hậu', 'VERIFY_COORDINATE', 'Tủ điện MDB-A01', 'Xác thực tọa độ CAD X=15500, Y=19500 mm trùng khớp As-built'],
    ['LOG-003', '2026-09-24 17:40', 'KS. Trần Đình Trọng', 'UPDATE_SPEC', 'Bộ xử lý AHU-02', 'Cập nhật lưu lượng gió lên 28,000 m3/h theo Rev.02'],
    ['LOG-004', '2026-09-24 17:42', 'KS. Giám Sát Hiện Trường', 'PHOTO_MATCH', 'Thang cuốn ES-01', 'Khớp thành công qua OCR Nameplate và cập nhật ảnh vào Digital Twin']
  ]);

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: 'TIEN_DO_CONG_VIEC!A1',
          values: [progressHeaders, ...progressRows]
        },
        {
          range: 'VI_TRI_THIET_BI_PHONG!A1',
          values: [assetHeaders, ...assetRows]
        },
        {
          range: 'BOC_TACH_KHOI_LUONG_BOQ!A1',
          values: [qtyHeaders, ...qtyRows]
        },
        {
          range: 'NHAT_KY_HOAT_DONG_LOG!A1',
          values: [logHeaders, ...logRows]
        }
      ]
    })
  });

  return { spreadsheetId, url };
};

/**
 * Append a single live inspection log directly to a Google Sheet
 */
export const appendLiveFieldLogToSheet = async (
  spreadsheetId: string,
  logItem: {
    logId: string;
    timestamp: string;
    engineer: string;
    category: string;
    equipment: string;
    assetTag: string;
    location: string;
    readings: string;
    condition: string;
    actionRequired: string;
    priority: string;
  }
) => {
  const headers = await getHeaders();

  const values = [
    [
      logItem.logId,
      logItem.timestamp,
      logItem.engineer,
      logItem.category,
      logItem.equipment,
      logItem.assetTag,
      logItem.location,
      logItem.readings,
      logItem.condition,
      logItem.actionRequired,
      logItem.priority
    ]
  ];

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/NHAT_KY_HOAT_DONG_LOG!A1:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ values })
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Không thể ghi log vào Google Sheets');
  }

  return await res.json();
};

/**
 * Generate Dedicated Inspection & Operations Google Sheet with 3 Technical Templates:
 * 1. MAU_LOG_HIEN_TRUONG (Field Log & Inspection)
 * 2. THEO_DOI_SU_CO_BAO_TRI (Incident & Maintenance Tracking)
 * 3. NGHIEM_THU_VAN_HANH_MEP (MEP Commissioning & Handover)
 */
export const createFieldInspectionSpreadsheetWithTemplates = async (
  title: string
): Promise<{ spreadsheetId: string; url: string }> => {
  const headers = await getHeaders();

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      properties: { title },
      sheets: [
        { properties: { title: 'MAU_LOG_HIEN_TRUONG' } },
        { properties: { title: 'THEO_DOI_SU_CO_BAO_TRI' } },
        { properties: { title: 'NGHIEM_THU_VAN_HANH_MEP' } }
      ]
    })
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Không thể tạo mẫu Google Sheet');
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const url = sheetData.spreadsheetUrl;

  // 1. MAU_LOG_HIEN_TRUONG
  const template1Headers = [
    'Mã Log Hiện Trường',
    'Thời Gian Ghi Nhận',
    'Kỹ Sư Kiểm Tra',
    'Phân Loại Hạng Mục',
    'Tên Thiết Bị / Máy Móc',
    'Mã Định Danh (Tag)',
    'Vị Trí (Phòng / Tầng)',
    'Số Liệu Đo Kiểm & Hiện Trạng',
    'Tình Trạng Vận Hành',
    'Biện Pháp Xử Lý Đề Xuất',
    'Mức Độ Ưu Tiên',
    'Ghi Chú Nguồn CAD'
  ];
  const template1Rows = [
    ['LOG-001', '2026-09-24 08:30', 'KS. Nguyễn Văn Hậu', 'TỦ ĐIỆN', 'Tủ phân phối hạ thế tổng', 'MDB-A01', 'E-101 (Tầng 1)', 'Nhiệt độ thanh cái 38.5°C, Dòng tải 1850A, Điện áp 382V', 'BÌNH THƯỜNG', 'Tiếp tục theo dõi ca trực', 'TRUNG BÌNH', 'CAD X=15500, Y=19500'],
    ['LOG-002', '2026-09-24 09:15', 'KS. Trần Đình Trọng', 'PHÒNG MÁY', 'Bộ xử lý không khí trung tâm', 'AHU-02', 'AHU-RM-02 (Tầng 1)', 'Lưu lượng gió 28,100 m3/h, Chênh áp phin lọc 120Pa', 'BÌNH THƯỜNG', 'Lên lịch vệ sinh lưới lọc sơ cấp tháng tới', 'THẤP', 'CAD X=28500, Y=19800'],
    ['LOG-003', '2026-09-24 10:00', 'KS. Lê Hoàng Long', 'THANG CUỐN', 'Thang cuốn hành khách', 'ES-01', 'Sảnh Concourse A', 'Tay vịn chuyển động đồng tốc, Cảm biến dừng khẩn hoạt động tốt', 'BÌNH THƯỜNG', 'Bổ sung dầu tra xích định kỳ', 'THẤP', 'CAD X=42000, Y=22000'],
    ['LOG-004', '2026-09-24 10:45', 'Đội PCCC Tân Sơn Nhất', 'PHÒNG BƠM', 'Máy bơm chữa cháy Diesel', 'FP-01', 'PR-01 (Basement B1)', 'Áp suất duy trì 11.2 bar, Bình ắc quy 26.5V. Van hút có vết ố rỉ nhẹ', 'CẦN BẢO TRÌ', 'Cạo rỉ và sơn phủ chống ăn mòn bích van số 2', 'CAO', 'CAD X=17000, Y=31500'],
    ['LOG-005', '2026-09-24 11:20', 'KS. Võ Minh Tuấn', 'NHÀ VỆ SINH', 'Cụm van xả cảm ứng tự động', 'WC-A01', 'WC-A01 (Sảnh Đến)', 'Áp lực nước 2.1 bar, 2 vòi rửa tự động nhạy tốt', 'BÌNH THƯỜNG', 'Đã thay pin cảm ứng 1 vòi', 'THẤP', 'CAD X=27000, Y=29500']
  ];

  // 2. THEO_DOI_SU_CO_BAO_TRI
  const template2Headers = [
    'Mã Sự Cố (Ticket ID)',
    'Thời Điểm Phát Hiện',
    'Thiết Bị Gặp Sự Cố',
    'Vị Trí Không Gian',
    'Mô Tả Chi Tiết Sự Cố',
    'Mức Độ Nghiêm Trọng',
    'Vật Tư / Phụ Tùng Đề Xuất Thay Thế',
    'Kỹ Sư Tiếp Nhận',
    'Hạn Định Xử Lý',
    'Tình Trạng Khắc Phục'
  ];
  const template2Rows = [
    ['INC-2026-01', '2026-09-23 14:00', 'Bơm cứu hỏa FP-01', 'Phòng bơm PR-01', 'Rỉ nhẹ gioăng cao su bích van hút DN200', 'TRUNG BÌNH', 'Gioăng amiăng cao su DN200 PN16', 'KS. Nguyễn Văn Hậu', '2026-09-28', 'ĐANG ĐẶT VẬT TƯ'],
    ['INC-2026-02', '2026-09-24 09:30', 'Tủ điện chiếu sáng DB-LIGHT-01', 'E-101', 'Aptomat MCB nhánh 3 pha cấp đèn sảnh hơi ấm (48°C)', 'CAO', 'MCB Schneider 3P 32A 10kA', 'KS. Võ Minh Tuấn', '2026-09-25', 'ĐÃ XỬ LÝ XONG']
  ];

  // 3. NGHIEM_THU_VAN_HANH_MEP
  const template3Headers = [
    'Mã Biên Bản',
    'Hạng Mục Nghiệm Thu',
    'Khu Vực / Tầng',
    'Hồ Sơ Bản Vẽ As-built',
    'Tiêu Chuẩn Đánh Giá',
    'Kết Quả Đo Đạc Thực Tế',
    'Đại Diện Ban QLDA',
    'Đại Diện Tư Vấn Giám Sát',
    'Đại Diện Nhà Thầu',
    'Kết Luận Nghiệm Thu'
  ];
  const template3Rows = [
    ['NT-MEP-01', 'Hệ thống Tủ điện phân phối MDB & DB', 'Tầng 1 (Zone A)', 'TSN-T2-MEP-E-01 Rev.03', 'TCVN 9207 / IEC 61439', 'Điện trở cách điện > 100 MOhm, độ sụt áp < 2.5%', 'KS. Nguyễn Văn Hậu', 'KS. Tư vấn Apave', 'KS. Nhà thầu MEP', 'ĐẠT YÊU CẦU NGHIỆM THU'],
    ['NT-MEP-02', 'Hệ thống Thông gió & Điều hòa AHU', 'Tầng 1 (Zone A)', 'TSN-T2-MEP-M-02 Rev.02', 'ASHRAE 62.1 / TCVN 5687', 'Lưu lượng gió đạt 101% thiết kế, độ ồn < 55dB', 'KS. Trần Đình Trọng', 'KS. Tư vấn Apave', 'KS. Nhà thầu MEP', 'ĐẠT YÊU CẦU NGHIỆM THU'],
    ['NT-MEP-03', 'Trạm Bơm Chữa Cháy PCCC', 'Basement B1 (Zone B)', 'TSN-T2-MEP-FP-01 Rev.01', 'NFPA 20 / TCVN 3890', 'Lưu lượng 750 GPM @ 110m cột áp, khởi động < 10s', 'Đội PCCC Tân Sơn Nhất', 'Cảnh sát PCCC TP.HCM', 'KS. Nhà thầu MEP', 'ĐÃ NGHIỆM THU PCCC']
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: 'MAU_LOG_HIEN_TRUONG!A1',
          values: [template1Headers, ...template1Rows]
        },
        {
          range: 'THEO_DOI_SU_CO_BAO_TRI!A1',
          values: [template2Headers, ...template2Rows]
        },
        {
          range: 'NGHIEM_THU_VAN_HANH_MEP!A1',
          values: [template3Headers, ...template3Rows]
        }
      ]
    })
  });

  return { spreadsheetId, url };
};

/**
 * 3. Gmail API
 */
export const sendGmailNotification = async (recipientEmail: string, subject: string, bodyText: string) => {
  const headers = await getHeaders();

  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const messageParts = [
    `To: ${recipientEmail}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${utf8Subject}`,
    '',
    bodyText
  ];
  const message = messageParts.join('\n');
  const encodedMessage = btoa(unescape(encodeURIComponent(message)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers,
    body: JSON.stringify({ raw: encodedMessage })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Không thể gửi email qua Gmail');
  }

  return await res.json();
};

/**
 * 4. Google Calendar API
 */
export const createMaintenanceCalendarEvent = async (event: CalendarEventItem) => {
  const headers = await getHeaders();

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers,
    body: JSON.stringify(event)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Không thể tạo sự kiện lịch');
  }

  return await res.json();
};

/**
 * 5. Google Forms API
 */
export const createInspectionGoogleForm = async (title: string, assetTags: string[]): Promise<{ formId: string; responderUri: string }> => {
  const headers = await getHeaders();

  // Create Form
  const res = await fetch('https://forms.googleapis.com/v1/forms', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      info: {
        title,
        documentTitle: title
      }
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Không thể tạo Google Form');
  }

  const formData = await res.json();
  const formId = formData.formId;
  const responderUri = formData.responderUri;

  // Add questions to the form
  await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      requests: [
        {
          createItem: {
            item: {
              title: 'Mã thiết bị cần kiểm tra (Asset Tag)',
              questionItem: {
                question: {
                  required: true,
                  choiceQuestion: {
                    type: 'DROP_DOWN',
                    options: assetTags.slice(0, 10).map(tag => ({ value: tag }))
                  }
                }
              }
            },
            location: { index: 0 }
          }
        },
        {
          createItem: {
            item: {
              title: 'Tình trạng hoạt động tại hiện trường',
              questionItem: {
                question: {
                  required: true,
                  choiceQuestion: {
                    type: 'RADIO',
                    options: [
                      { value: 'Bình thường (Operational)' },
                      { value: 'Cần bảo dưỡng (Maintenance Required)' },
                      { value: 'Đang sự cố / Dừng máy (Fault / Offline)' }
                    ]
                  }
                }
              }
            },
            location: { index: 1 }
          }
        },
        {
          createItem: {
            item: {
              title: 'Ghi chú kỹ thuật & chỉ số đồng hồ đo',
              questionItem: {
                question: {
                  required: false,
                  textQuestion: { paragraph: true }
                }
              }
            },
            location: { index: 2 }
          }
        }
      ]
    })
  });

  return { formId, responderUri };
};

export const getFormResponses = async (formId: string): Promise<any[]> => {
  const headers = await getHeaders();
  try {
    const res = await fetch(`https://forms.googleapis.com/v1/forms/${formId}/responses`, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return data.responses || [];
  } catch (e) {
    return [];
  }
};

/**
 * 6. Google Contacts (People API)
 */
export const listMEPEngineerContacts = async (): Promise<ContactItem[]> => {
  const headers = await getHeaders();

  const res = await fetch(
    'https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,occupations&pageSize=30',
    { headers }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Không thể đọc danh bạ Google Contacts');
  }

  const data = await res.json();
  const connections = data.connections || [];

  return connections.map((person: any) => ({
    resourceName: person.resourceName,
    displayName: person.names?.[0]?.displayName || 'Kỹ sư chưa đặt tên',
    email: person.emailAddresses?.[0]?.value,
    phone: person.phoneNumbers?.[0]?.value,
    jobTitle: person.occupations?.[0]?.value || 'Kỹ sư CAD/MEP'
  }));
};

/**
 * 7. Two-Way Sync Helpers: Sheets, Calendar, Gmail
 */
export const readSpreadsheetValues = async (spreadsheetId: string, range: string): Promise<any[][]> => {
  const headers = await getHeaders();
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    { headers }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Không thể đọc dữ liệu Google Sheets');
  }
  const data = await res.json();
  return data.values || [];
};

export const importAssetsFromGoogleSheet = async (spreadsheetId: string): Promise<Asset[]> => {
  const rows = await readSpreadsheetValues(spreadsheetId, 'VI_TRI_THIET_BI_PHONG!A2:P');
  if (!rows || rows.length === 0) {
    throw new Error('Tab VI_TRI_THIET_BI_PHONG không có dữ liệu hoặc không tồn tại.');
  }

  const importedAssets: Asset[] = [];
  rows.forEach((row, idx) => {
    if (!row[0] && !row[1]) return;
    const tag = String(row[0] || `AST-SHT-${idx + 1}`).trim();
    const name = String(row[1] || `Thiết bị ${tag}`).trim();
    const type = String(row[2] || 'Tủ điện').trim();
    const system = (String(row[3] || 'ELECTRICAL').trim().toUpperCase() as any) || 'ELECTRICAL';
    const floor = String(row[4] || 'Tầng 1 (Level 1)').trim();
    const zone = String(row[5] || 'Zone A').trim();
    const room = String(row[6] || 'Phòng Kỹ thuật').trim();
    const x = parseFloat(row[7]) || 1000 + idx * 500;
    const y = parseFloat(row[8]) || 1000 + idx * 300;
    const z = parseFloat(row[9]) || 0;
    const manufacturer = String(row[10] || 'Schneider Electric').trim();
    const model = String(row[11] || 'Standard').trim();
    const status = (String(row[12] || 'OPERATIONAL').trim().toUpperCase() as any) || 'OPERATIONAL';

    importedAssets.push({
      assetId: `AST-SHT-${idx + 1}-${Date.now().toString().slice(-4)}`,
      assetTag: tag,
      assetName: name,
      assetType: type,
      system,
      manufacturer,
      model,
      floor,
      zone,
      room,
      cadCoordinates: {
        x,
        y,
        z,
        units: 'mm',
        coordinateSystem: 'VN2000_TSN',
        sourceHandle: `H-SHT-${idx + 1}`
      },
      sourceDrawing: String(row[14] || 'Google_Sheets_Sync.dxf'),
      sourceRevision: String(row[15] || 'Rev.Sheets'),
      criticality: 'HIGH',
      status,
      validationStatus: 'VERIFIED',
      confidence: 0.99,
      verifiedBy: 'Google Sheets 2-Way Sync',
      lastVerifiedAt: new Date().toLocaleString(),
      specs: [],
      inspectionHistory: [
        {
          logId: `LOG-SHT-${idx + 1}`,
          timestamp: new Date().toLocaleString(),
          user: 'Đồng bộ 2 chiều Google Sheets',
          action: 'IMPORTED',
          description: `Đồng bộ trực tiếp 2 chiều từ Google Spreadsheet ID ${spreadsheetId}.`
        }
      ]
    });
  });

  return importedAssets;
};

export const listUpcomingCalendarEvents = async (maxResults = 10): Promise<CalendarEventItem[]> => {
  const headers = await getHeaders();
  const nowIso = new Date().toISOString();
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(nowIso)}&orderBy=startTime&singleEvents=true&maxResults=${maxResults}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Không thể lấy danh sách sự kiện Google Calendar');
  }
  const data = await res.json();
  const items = data.items || [];
  return items.map((it: any) => ({
    id: it.id,
    summary: it.summary || 'Kiểm tra bảo dưỡng MEP',
    description: it.description || '',
    start: it.start || { dateTime: nowIso, timeZone: 'Asia/Ho_Chi_Minh' },
    end: it.end || { dateTime: nowIso, timeZone: 'Asia/Ho_Chi_Minh' },
    location: it.location || 'Sân bay Quốc tế Tân Sơn Nhất'
  }));
};

export const listRecentGmailMessages = async (maxResults = 6): Promise<GmailMessageSummary[]> => {
  const headers = await getHeaders();
  const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`, { headers });
  if (!listRes.ok) {
    const err = await listRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Không thể đọc hộp thư Gmail');
  }
  const listData = await listRes.json();
  const messages = listData.messages || [];

  const summaries: GmailMessageSummary[] = [];
  for (const m of messages.slice(0, 5)) {
    try {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers }
      );
      if (msgRes.ok) {
        const msgData = await msgRes.json();
        const getHeader = (name: string) => msgData.payload?.headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
        summaries.push({
          id: m.id,
          snippet: msgData.snippet || '',
          subject: getHeader('Subject') || '(Không có tiêu đề)',
          from: getHeader('From') || 'Không rõ người gửi',
          date: getHeader('Date') || ''
        });
      }
    } catch (e) {
      // ignore single error
    }
  }
  return summaries;
};
