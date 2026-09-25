/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { Asset, SystemDiscipline } from '../types';

/**
 * Flexible column key normalizer
 */
const normalizeColKey = (key: string): string => {
  return key
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove Vietnamese diacritics for flexible matching
    .replace(/[^a-z0-9]/g, '');
};

/**
 * Parse an uploaded .xlsx or .xls file into Asset[]
 */
export const parseEquipmentXLSX = async (file: File): Promise<Asset[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  // Use the first sheet or one containing "thiet bi" / "asset"
  let sheetName = workbook.SheetNames[0];
  for (const name of workbook.SheetNames) {
    const lower = name.toLowerCase();
    if (lower.includes('thiet bi') || lower.includes('asset') || lower.includes('vi tri')) {
      sheetName = name;
      break;
    }
  }

  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) return [];

  // Convert to JSON array of objects
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  const assets: Asset[] = [];

  rawRows.forEach((row, index) => {
    // Map columns flexibly
    let tag = '';
    let name = '';
    let type = 'Tủ điện';
    let system: SystemDiscipline = 'ELECTRICAL';
    let floor = 'Tầng 1 (Level 1)';
    let zone = 'Zone A';
    let room = 'Khu vực kỹ thuật';
    let x = 15000 + (index % 10) * 3000;
    let y = 18000 + Math.floor(index / 10) * 2500;
    let z = 0;
    let manufacturer = 'Schneider / Carrier / Ebara';
    let model = 'Phiên bản 2026';
    let status: any = 'OPERATIONAL';

    Object.entries(row).forEach(([colName, val]) => {
      const col = normalizeColKey(colName);
      const strVal = String(val).trim();
      if (!strVal) return;

      // Tag
      if (col.includes('tag') || col.includes('ma') || col.includes('id') || col.includes('code')) {
        tag = strVal;
      }
      // Name
      else if (col.includes('ten') || col.includes('name') || col.includes('mota') || col.includes('description')) {
        name = strVal;
      }
      // Type / Category
      else if (col.includes('loai') || col.includes('type') || col.includes('phanloai') || col.includes('category')) {
        type = strVal;
      }
      // System
      else if (col.includes('hethong') || col.includes('system') || col.includes('discipline')) {
        const up = strVal.toUpperCase();
        if (up.includes('DIEN') || up.includes('ELEC')) system = 'ELECTRICAL';
        else if (up.includes('HVAC') || up.includes('KHI') || up.includes('LANH')) system = 'HVAC';
        else if (up.includes('PCCC') || up.includes('CUU') || up.includes('FIRE')) system = 'FIRE_PROTECTION';
        else if (up.includes('NUOC') || up.includes('PLUMB') || up.includes('SAN')) system = 'PLUMBING';
        else system = 'ARCHITECTURE';
      }
      // Floor
      else if (col.includes('tang') || col.includes('floor') || col.includes('level')) {
        floor = strVal;
      }
      // Zone
      else if (col.includes('khu') || col.includes('zone') || col.includes('phankhu')) {
        zone = strVal;
      }
      // Room
      else if (col.includes('phong') || col.includes('room') || col.includes('vitri') || col.includes('location')) {
        room = strVal;
      }
      // CAD X
      else if (col === 'x' || col.includes('toadox') || col.includes('cadx') || col.includes('coordx')) {
        const num = parseFloat(strVal);
        if (!isNaN(num)) x = num;
      }
      // CAD Y
      else if (col === 'y' || col.includes('toadoy') || col.includes('cady') || col.includes('coordy')) {
        const num = parseFloat(strVal);
        if (!isNaN(num)) y = num;
      }
      // CAD Z
      else if (col === 'z' || col.includes('toadoz') || col.includes('cadz')) {
        const num = parseFloat(strVal);
        if (!isNaN(num)) z = num;
      }
      // Manufacturer
      else if (col.includes('hang') || col.includes('manufacturer') || col.includes('brand') || col.includes('nsx')) {
        manufacturer = strVal;
      }
      // Model
      else if (col.includes('model') || col.includes('dongmay') || col.includes('dongthietbi')) {
        model = strVal;
      }
      // Status
      else if (col.includes('trangthai') || col.includes('status') || col.includes('tinhtrang')) {
        const up = strVal.toUpperCase();
        if (up.includes('BAOTRI') || up.includes('MAINTENANCE')) status = 'MAINTENANCE_REQUIRED';
        else if (up.includes('SUCO') || up.includes('FAULT') || up.includes('OFFLINE')) status = 'FAULT';
        else if (up.includes('DU') || up.includes('STANDBY')) status = 'STANDBY';
        else status = 'OPERATIONAL';
      }
    });

    // Fallback if tag is missing
    if (!tag) {
      tag = `AST-XL-${index + 1}`;
    }
    if (!name) {
      name = `${type} ${tag}`;
    }

    assets.push({
      assetId: `AST-XLSX-${Date.now().toString().slice(-4)}-${index + 1}`,
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
        sourceHandle: `XL-${Math.floor(1000 + Math.random() * 9000).toString(16).toUpperCase()}`
      },
      sourceDrawing: file.name,
      sourceRevision: 'Import-XLSX',
      criticality: 'HIGH',
      status,
      validationStatus: 'VERIFIED',
      confidence: 0.98,
      verifiedBy: 'Imported from Excel (.xlsx)',
      lastVerifiedAt: new Date().toLocaleString(),
      specs: [
        {
          specId: `SP-XL-${index + 1}`,
          parameter: 'Nguồn dữ liệu nhập',
          value: file.name,
          sourceDoc: 'Excel Spreadsheet',
          confidence: 0.99,
          status: 'VERIFIED'
        }
      ],
      inspectionHistory: [
        {
          logId: `LOG-XL-${Date.now().toString().slice(-4)}-${index + 1}`,
          timestamp: new Date().toLocaleString(),
          user: 'Hệ thống Excel Importer',
          action: 'IMPORTED',
          description: `Nhập khẩu tự động từ file ${file.name} gồm tọa độ CAD X=${x}, Y=${y}.`
        }
      ]
    });
  });

  return assets;
};

/**
 * Generate and trigger download of a sample Excel template for equipment data
 */
export const downloadSampleEquipmentXLSX = () => {
  const sampleData = [
    {
      'Mã Thiết Bị (Tag)': 'MDB-A01',
      'Tên Thiết Bị': 'Tủ phân phối điện hạ thế tổng MDB 2500A Form 4B',
      'Phân Loại': 'Tủ điện',
      'Hệ Thống': 'ELECTRICAL',
      'Tầng': 'Tầng 1 (Level 1)',
      'Phân Khu': 'Zone A - Cánh Đông',
      'Vị Trí Phòng': 'E-101 - Phòng Điện Hạ Thế',
      'Tọa Độ CAD X (mm)': 15500,
      'Tọa Độ CAD Y (mm)': 19500,
      'Tọa Độ CAD Z (mm)': 0,
      'Hãng Sản Xuất': 'Schneider Electric',
      'Model': 'PrismaSeT P Active',
      'Trạng Thái': 'OPERATIONAL'
    },
    {
      'Mã Thiết Bị (Tag)': 'AHU-02',
      'Tên Thiết Bị': 'Bộ xử lý không khí trung tâm AHU Sảnh Đến',
      'Phân Loại': 'Phòng máy',
      'Hệ Thống': 'HVAC',
      'Tầng': 'Tầng 1 (Level 1)',
      'Phân Khu': 'Zone A - Cánh Đông',
      'Vị Trí Phòng': 'AHU-RM-02 - Phòng AHU',
      'Tọa Độ CAD X (mm)': 28500,
      'Tọa Độ CAD Y (mm)': 19800,
      'Tọa Độ CAD Z (mm)': 0,
      'Hãng Sản Xuất': 'Carrier Corporation',
      'Model': '39HQ Modular',
      'Trạng Thái': 'OPERATIONAL'
    },
    {
      'Mã Thiết Bị (Tag)': 'ES-01',
      'Tên Thiết Bị': 'Thang cuốn hành khách sảnh đón ga T2',
      'Phân Loại': 'Thang cuốn',
      'Hệ Thống': 'ARCHITECTURE',
      'Tầng': 'Tầng 1 (Level 1)',
      'Phân Khu': 'Zone A',
      'Vị Trí Phòng': 'Concourse A - Sảnh Đến',
      'Tọa Độ CAD X (mm)': 42000,
      'Tọa Độ CAD Y (mm)': 22000,
      'Tọa Độ CAD Z (mm)': 0,
      'Hãng Sản Xuất': 'Otis Elevator Company',
      'Model': '510NPE Heavy Duty',
      'Trạng Thái': 'OPERATIONAL'
    },
    {
      'Mã Thiết Bị (Tag)': 'EL-01',
      'Tên Thiết Bị': 'Thang máy quan sát kính tải trọng 1600kg',
      'Phân Loại': 'Thang máy',
      'Hệ Thống': 'ARCHITECTURE',
      'Tầng': 'Tầng 1 (Level 1)',
      'Phân Khu': 'Zone A',
      'Vị Trí Phòng': 'Concourse A - Giếng Thang 1',
      'Tọa Độ CAD X (mm)': 51000,
      'Tọa Độ CAD Y (mm)': 25000,
      'Tọa Độ CAD Z (mm)': 0,
      'Hãng Sản Xuất': 'KONE MonoSpace',
      'Model': 'DX500 Scenic',
      'Trạng Thái': 'OPERATIONAL'
    },
    {
      'Mã Thiết Bị (Tag)': 'WC-A01',
      'Tên Thiết Bị': 'Cụm thiết bị vệ sinh tự động thông minh',
      'Phân Loại': 'Nhà vệ sinh',
      'Hệ Thống': 'PLUMBING',
      'Tầng': 'Tầng 1 (Level 1)',
      'Phân Khu': 'Zone A',
      'Vị Trí Phòng': 'WC-A01 - Khu Vệ Sinh Sảnh Đến',
      'Tọa Độ CAD X (mm)': 27000,
      'Tọa Độ CAD Y (mm)': 29500,
      'Tọa Độ CAD Z (mm)': 0,
      'Hãng Sản Xuất': 'TOTO / Inax',
      'Model': 'Touchless Suite Pro',
      'Trạng Thái': 'OPERATIONAL'
    },
    {
      'Mã Thiết Bị (Tag)': 'FP-01',
      'Tên Thiết Bị': 'Máy bơm chữa cháy động cơ Diesel 750 GPM',
      'Phân Loại': 'Phòng bơm',
      'Hệ Thống': 'FIRE_PROTECTION',
      'Tầng': 'Tầng Hầm (Basement B1)',
      'Phân Khu': 'Zone B',
      'Vị Trí Phòng': 'PR-01 - Trạm Bơm PCCC',
      'Tọa Độ CAD X (mm)': 17000,
      'Tọa Độ CAD Y (mm)': 31500,
      'Tọa Độ CAD Z (mm)': 0,
      'Hãng Sản Xuất': 'Ebara Corporation',
      'Model': 'FSA 200x150',
      'Trạng Thái': 'STANDBY'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'DANH_MUC_THIET_BI');

  XLSX.writeFile(workbook, `Mau_Nhap_Thiet_Bi_MEP_TanSonNhat.xlsx`);
};
