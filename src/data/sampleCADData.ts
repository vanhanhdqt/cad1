/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Asset, CADEntity, Drawing, Project, QuantityItem, Room } from '../types';

export const SAMPLE_ROOMS: Room[] = [
  {
    roomId: 'RM-E101',
    roomNumber: 'E-101',
    roomName: 'Phòng Điện Hạ Thế & Phân Phối MDB',
    floor: 'Tầng 1 (Level 1)',
    zone: 'Zone A - Cánh Đông',
    areaSqm: 84.5,
    perimeterM: 37.0,
    polygon: [
      { x: 12000, y: 15000 },
      { x: 21500, y: 15000 },
      { x: 21500, y: 24000 },
      { x: 12000, y: 24000 }
    ],
    boundaryStatus: 'CLOSED_POLYGON',
    sourceFile: 'TSN-T2-MEP-E-01.dxf',
    sourceRevision: 'Rev.03',
    servingSystems: ['ELECTRICAL', 'BMS'],
    assetCount: 3
  },
  {
    roomId: 'RM-AHU02',
    roomNumber: 'AHU-RM-02',
    roomName: 'Phòng Máy Điều Hòa Không Khí AHU',
    floor: 'Tầng 1 (Level 1)',
    zone: 'Zone A - Cánh Đông',
    areaSqm: 112.0,
    perimeterM: 44.0,
    polygon: [
      { x: 23000, y: 15000 },
      { x: 35000, y: 15000 },
      { x: 35000, y: 24500 },
      { x: 23000, y: 24500 }
    ],
    boundaryStatus: 'CLOSED_POLYGON',
    sourceFile: 'TSN-T2-MEP-M-02.dxf',
    sourceRevision: 'Rev.02',
    servingSystems: ['HVAC', 'BMS'],
    assetCount: 2
  },
  {
    roomId: 'RM-PR01',
    roomNumber: 'PR-01',
    roomName: 'Trạm Bơm Phòng Cháy Chữa Cháy & Cấp Nước',
    floor: 'Tầng Hầm (Basement B1)',
    zone: 'Zone B - Khu Kỹ thuật Trung tâm',
    areaSqm: 145.0,
    perimeterM: 49.0,
    polygon: [
      { x: 12000, y: 26000 },
      { x: 25000, y: 26000 },
      { x: 25000, y: 37500 },
      { x: 12000, y: 37500 }
    ],
    boundaryStatus: 'CLOSED_POLYGON',
    sourceFile: 'TSN-T2-MEP-FP-01.dxf',
    sourceRevision: 'Rev.01',
    servingSystems: ['FIRE_PROTECTION', 'PLUMBING'],
    assetCount: 2
  },
  {
    roomId: 'RM-CONCOURSE',
    roomNumber: 'CONCOURSE-A',
    roomName: 'Sảnh Chờ Nhà Ga Hành Khách Quốc Tế',
    floor: 'Tầng 1 (Level 1)',
    zone: 'Zone A - Cánh Đông',
    areaSqm: 420.0,
    perimeterM: 88.0,
    polygon: [
      { x: 37000, y: 15000 },
      { x: 58000, y: 15000 },
      { x: 58000, y: 35000 },
      { x: 37000, y: 35000 }
    ],
    boundaryStatus: 'CLOSED_POLYGON',
    sourceFile: 'TSN-T2-ARCH-01.dxf',
    sourceRevision: 'Rev.04',
    servingSystems: ['HVAC', 'ELECTRICAL', 'FIRE_PROTECTION'],
    assetCount: 2
  },
  {
    roomId: 'RM-WCA01',
    roomNumber: 'WC-A01',
    roomName: 'Khu Vệ Sinh Công Cộng Sảnh Đến (Nam/Nữ/Khuyết tật)',
    floor: 'Tầng 1 (Level 1)',
    zone: 'Zone A - Cánh Đông',
    areaSqm: 56.0,
    perimeterM: 30.0,
    polygon: [
      { x: 23000, y: 26000 },
      { x: 31000, y: 26000 },
      { x: 31000, y: 33000 },
      { x: 23000, y: 33000 }
    ],
    boundaryStatus: 'CLOSED_POLYGON',
    sourceFile: 'TSN-T2-ARCH-01.dxf',
    sourceRevision: 'Rev.04',
    servingSystems: ['PLUMBING', 'ELECTRICAL'],
    assetCount: 1
  }
];

export const SAMPLE_ENTITIES: CADEntity[] = [
  // Electrical entities
  {
    entityId: 'ENT-E-01',
    cadHandle: '8AF2',
    entityType: 'INSERT',
    layer: 'E-PANEL-MDB',
    discipline: 'ELECTRICAL',
    blockName: 'BLK_MDB_PANEL',
    text: 'Tủ điện MDB-A01',
    coordinates: { x: 15500, y: 19500, z: 0, units: 'mm', coordinateSystem: 'VN2000_TSN' },
    bbox: { minX: 14500, minY: 18800, maxX: 16500, maxY: 20200 },
    color: '#EAB308',
    sourceFile: 'TSN-T2-MEP-E-01.dxf',
    sourceRevision: 'Rev.03',
    isAsset: true,
    assetTag: 'MDB-A01'
  },
  {
    entityId: 'ENT-E-02',
    cadHandle: '8B14',
    entityType: 'INSERT',
    layer: 'E-PANEL-DB',
    discipline: 'ELECTRICAL',
    blockName: 'BLK_DB_LIGHT',
    text: 'Tủ chiếu sáng DB-LIGHT-01',
    coordinates: { x: 19000, y: 22000, z: 0, units: 'mm', coordinateSystem: 'VN2000_TSN' },
    bbox: { minX: 18500, minY: 21500, maxX: 19500, maxY: 22500 },
    color: '#CA8A04',
    sourceFile: 'TSN-T2-MEP-E-01.dxf',
    sourceRevision: 'Rev.03',
    isAsset: true,
    assetTag: 'DB-LIGHT-01'
  },
  {
    entityId: 'ENT-E-TRAY-01',
    cadHandle: '8C05',
    entityType: 'LWPOLYLINE',
    layer: 'E-CABLE-TRAY-400',
    discipline: 'ELECTRICAL',
    length: 34500,
    coordinates: { x: 13000, y: 17000, z: 2800, units: 'mm', coordinateSystem: 'VN2000_TSN' },
    bbox: { minX: 13000, minY: 17000, maxX: 47500, maxY: 17200 },
    vertices: [
      { x: 13000, y: 17000 },
      { x: 25000, y: 17000 },
      { x: 37000, y: 17000 },
      { x: 47500, y: 17000 }
    ],
    color: '#F59E0B',
    sourceFile: 'TSN-T2-MEP-E-01.dxf',
    sourceRevision: 'Rev.03'
  },

  // HVAC entities
  {
    entityId: 'ENT-M-01',
    cadHandle: '9D41',
    entityType: 'INSERT',
    layer: 'M-HVAC-AHU',
    discipline: 'HVAC',
    blockName: 'BLK_AHU_CARRIER',
    text: 'Bộ xử lý không khí AHU-02',
    coordinates: { x: 28500, y: 19800, z: 0, units: 'mm', coordinateSystem: 'VN2000_TSN' },
    bbox: { minX: 26500, minY: 18000, maxX: 30500, maxY: 21600 },
    color: '#06B6D4',
    sourceFile: 'TSN-T2-MEP-M-02.dxf',
    sourceRevision: 'Rev.02',
    isAsset: true,
    assetTag: 'AHU-02'
  },
  {
    entityId: 'ENT-M-02',
    cadHandle: '9D88',
    entityType: 'INSERT',
    layer: 'M-HVAC-CHILLER',
    discipline: 'HVAC',
    blockName: 'BLK_CHILLER_TRANE',
    text: 'Máy làm lạnh nước Chiller CH-01 (1000RT)',
    coordinates: { x: 18500, y: 31000, z: 0, units: 'mm', coordinateSystem: 'VN2000_TSN' },
    bbox: { minX: 15500, minY: 28500, maxX: 21500, maxY: 33500 },
    color: '#0284C7',
    sourceFile: 'TSN-T2-MEP-M-02.dxf',
    sourceRevision: 'Rev.02',
    isAsset: true,
    assetTag: 'CH-01'
  },
  {
    entityId: 'ENT-M-DUCT-01',
    cadHandle: '9F12',
    entityType: 'LWPOLYLINE',
    layer: 'M-HVAC-DUCT-SUPPLY',
    discipline: 'HVAC',
    length: 52000,
    coordinates: { x: 29000, y: 21000, z: 3200, units: 'mm', coordinateSystem: 'VN2000_TSN' },
    bbox: { minX: 29000, minY: 21000, maxX: 56000, maxY: 27000 },
    vertices: [
      { x: 29000, y: 21000 },
      { x: 38000, y: 21000 },
      { x: 38000, y: 27000 },
      { x: 56000, y: 27000 }
    ],
    color: '#38BDF8',
    sourceFile: 'TSN-T2-MEP-M-02.dxf',
    sourceRevision: 'Rev.02'
  },

  // Fire Protection entities
  {
    entityId: 'ENT-FP-01',
    cadHandle: '7E20',
    entityType: 'INSERT',
    layer: 'FP-PUMP-FIRE',
    discipline: 'FIRE_PROTECTION',
    blockName: 'BLK_FIRE_PUMP_EBARA',
    text: 'Bơm cứu hỏa chính FP-01 (150kW)',
    coordinates: { x: 17000, y: 31500, z: 0, units: 'mm', coordinateSystem: 'VN2000_TSN' },
    bbox: { minX: 15500, minY: 30000, maxX: 18500, maxY: 33000 },
    color: '#EF4444',
    sourceFile: 'TSN-T2-MEP-FP-01.dxf',
    sourceRevision: 'Rev.01',
    isAsset: true,
    assetTag: 'FP-01'
  },
  {
    entityId: 'ENT-FP-PIPE-01',
    cadHandle: '7E88',
    entityType: 'LWPOLYLINE',
    layer: 'FP-SPRINKLER-MAIN-DN150',
    discipline: 'FIRE_PROTECTION',
    length: 68000,
    coordinates: { x: 13000, y: 31000, z: 3000, units: 'mm', coordinateSystem: 'VN2000_TSN' },
    bbox: { minX: 13000, minY: 16000, maxX: 56000, maxY: 31000 },
    vertices: [
      { x: 13000, y: 31000 },
      { x: 13000, y: 16000 },
      { x: 56000, y: 16000 }
    ],
    color: '#DC2626',
    sourceFile: 'TSN-T2-MEP-FP-01.dxf',
    sourceRevision: 'Rev.01'
  },

  // Vertical Transportation (Elevator / Escalator)
  {
    entityId: 'ENT-VT-01',
    cadHandle: '6A01',
    entityType: 'INSERT',
    layer: 'ARCH-ESCALATOR',
    discipline: 'ARCHITECTURE',
    blockName: 'BLK_ESCALATOR_OTIS',
    text: 'Thang cuốn hành khách ES-01',
    coordinates: { x: 42000, y: 22000, z: 0, units: 'mm', coordinateSystem: 'VN2000_TSN' },
    bbox: { minX: 40000, minY: 18000, maxX: 44000, maxY: 26000 },
    color: '#8B5CF6',
    sourceFile: 'TSN-T2-ARCH-01.dxf',
    sourceRevision: 'Rev.04',
    isAsset: true,
    assetTag: 'ES-01'
  },
  {
    entityId: 'ENT-VT-02',
    cadHandle: '6A15',
    entityType: 'INSERT',
    layer: 'ARCH-ELEVATOR',
    discipline: 'ARCHITECTURE',
    blockName: 'BLK_ELEVATOR_KONE',
    text: 'Thang máy quan sát EL-01 (1600kg)',
    coordinates: { x: 51000, y: 25000, z: 0, units: 'mm', coordinateSystem: 'VN2000_TSN' },
    bbox: { minX: 49500, minY: 23500, maxX: 52500, maxY: 26500 },
    color: '#A855F7',
    sourceFile: 'TSN-T2-ARCH-01.dxf',
    sourceRevision: 'Rev.04',
    isAsset: true,
    assetTag: 'EL-01'
  },
  {
    entityId: 'ENT-PLUMB-01',
    cadHandle: '5W01',
    entityType: 'INSERT',
    layer: 'PLUMB-FIXTURE-WC',
    discipline: 'PLUMBING',
    blockName: 'BLK_RESTROOM_SUITE',
    text: 'Cụm Nhà vệ sinh WC-A01',
    coordinates: { x: 27000, y: 29500, z: 0, units: 'mm', coordinateSystem: 'VN2000_TSN' },
    bbox: { minX: 25000, minY: 28000, maxX: 29000, maxY: 31000 },
    color: '#0D9488',
    sourceFile: 'TSN-T2-ARCH-01.dxf',
    sourceRevision: 'Rev.04',
    isAsset: true,
    assetTag: 'WC-A01'
  }
];

export const SAMPLE_ASSETS: Asset[] = [
  {
    assetId: 'AST-TSN-MDB-01',
    assetTag: 'MDB-A01',
    assetName: 'Tủ phân phối điện hạ thế tổng MDB-A01',
    assetType: 'Tủ điện MDB',
    system: 'ELECTRICAL',
    manufacturer: 'Schneider Electric',
    model: 'PrismaSeT P Active',
    serialNumber: 'SCH-VN-2024-88419',
    floor: 'Tầng 1 (Level 1)',
    zone: 'Zone A - Cánh Đông',
    room: 'E-101 - Phòng Điện Hạ Thế',
    cadCoordinates: {
      x: 15500,
      y: 19500,
      z: 0,
      units: 'mm',
      coordinateSystem: 'VN2000_TSN',
      sourceHandle: '8AF2',
      sourceLayer: 'E-PANEL-MDB'
    },
    sourceDrawing: 'TSN-T2-MEP-E-01.dxf',
    sourceRevision: 'Rev.03',
    criticality: 'HIGH',
    status: 'OPERATIONAL',
    validationStatus: 'VERIFIED',
    confidence: 0.98,
    verifiedBy: 'KS. Nguyễn Văn Hậu (Lead MEP)',
    lastVerifiedAt: '2026-09-18 09:30',
    qrCodeValue: 'AST:TSN:MDB-A01:E101',
    specs: [
      { specId: 'SP-1', parameter: 'Điện áp định mức (Rated Voltage)', value: '380/220V', unit: 'V', sourceDoc: 'Single Line Diagram SLD-01', confidence: 0.99, status: 'VERIFIED' },
      { specId: 'SP-2', parameter: 'Dòng điện định mức (Rated Current)', value: '2500A', unit: 'A', sourceDoc: 'Single Line Diagram SLD-01', confidence: 0.99, status: 'VERIFIED' },
      { specId: 'SP-3', parameter: 'Dòng ngắn mạch Icu', value: '65kA / 1s', unit: 'kA', sourceDoc: 'Datasheet Schneider', confidence: 0.95, status: 'VERIFIED' },
      { specId: 'SP-4', parameter: 'Cấp bảo vệ IP', value: 'IP54', sourceDoc: 'Datasheet Schneider', confidence: 0.96, status: 'VERIFIED' }
    ],
    inspectionHistory: [
      { logId: 'LOG-101', timestamp: '2026-08-15 14:00', user: 'Võ Minh Tuấn', action: 'MAINTAINED', description: 'Đo nhiệt độ điểm tiếp xúc bằng camera nhiệt Fluke: 38.4°C (Bình thường).' },
      { logId: 'LOG-102', timestamp: '2026-09-18 09:30', user: 'Nguyễn Văn Hậu', action: 'VERIFIED', description: 'Đối chiếu tọa độ CAD 8AF2 trùng khớp vị trí vật lý tại E-101.' }
    ]
  },
  {
    assetId: 'AST-TSN-AHU-02',
    assetTag: 'AHU-02',
    assetName: 'Bộ xử lý không khí trung tâm AHU-02 (Sảnh Đến)',
    assetType: 'Máy lạnh AHU',
    system: 'HVAC',
    manufacturer: 'Carrier Corporation',
    model: '39HQ Modular Air Handler',
    serialNumber: 'CAR-VN-39HQ-4912',
    floor: 'Tầng 1 (Level 1)',
    zone: 'Zone A - Cánh Đông',
    room: 'AHU-RM-02 - Phòng AHU',
    cadCoordinates: {
      x: 28500,
      y: 19800,
      z: 0,
      units: 'mm',
      coordinateSystem: 'VN2000_TSN',
      sourceHandle: '9D41',
      sourceLayer: 'M-HVAC-AHU'
    },
    sourceDrawing: 'TSN-T2-MEP-M-02.dxf',
    sourceRevision: 'Rev.02',
    criticality: 'HIGH',
    status: 'OPERATIONAL',
    validationStatus: 'VERIFIED',
    confidence: 0.97,
    verifiedBy: 'KS. Trần Đình Trọng',
    lastVerifiedAt: '2026-09-10 16:15',
    qrCodeValue: 'AST:TSN:AHU-02:AHURM02',
    specs: [
      { specId: 'SP-5', parameter: 'Lưu lượng gió (Air Flow)', value: '28,000', unit: 'm³/h', sourceDoc: 'Equipment Schedule M-02', confidence: 0.98, status: 'VERIFIED' },
      { specId: 'SP-6', parameter: 'Công suất làm lạnh (Cooling Capacity)', value: '185', unit: 'kW', sourceDoc: 'Equipment Schedule M-02', confidence: 0.98, status: 'VERIFIED' },
      { specId: 'SP-7', parameter: 'Công suất động cơ quạt (Motor Power)', value: '22', unit: 'kW', sourceDoc: 'Datasheet Carrier 39HQ', confidence: 0.95, status: 'VERIFIED' },
      { specId: 'SP-8', parameter: 'Môi chất tải lạnh', value: 'Chilled Water (7°C / 12°C)', unit: '°C', sourceDoc: 'MEP Specs', confidence: 0.99, status: 'VERIFIED' }
    ],
    inspectionHistory: [
      { logId: 'LOG-201', timestamp: '2026-09-02 10:20', user: 'Lê Quang Vinh', action: 'INSPECTED', description: 'Thay thế bộ lọc túi F7, vệ sinh khay hứng nước ngưng.' }
    ]
  },
  {
    assetId: 'AST-TSN-CH-01',
    assetTag: 'CH-01',
    assetName: 'Máy làm lạnh nước ly tâm Chiller CH-01 (1000RT)',
    assetType: 'Chiller Trane',
    system: 'HVAC',
    manufacturer: 'Trane Technologies',
    model: 'CentraVac CVHE-1000',
    serialNumber: 'TRN-CVHE-99201',
    floor: 'Tầng Hầm (Basement B1)',
    zone: 'Zone B - Trạm Kỹ thuật Trung tâm',
    room: 'PR-01 - Trạm Bơm & Chiller',
    cadCoordinates: {
      x: 18500,
      y: 31000,
      z: 0,
      units: 'mm',
      coordinateSystem: 'VN2000_TSN',
      sourceHandle: '9D88',
      sourceLayer: 'M-HVAC-CHILLER'
    },
    sourceDrawing: 'TSN-T2-MEP-M-02.dxf',
    sourceRevision: 'Rev.02',
    criticality: 'HIGH',
    status: 'OPERATIONAL',
    validationStatus: 'VERIFIED',
    confidence: 0.99,
    verifiedBy: 'KS. Nguyễn Văn Hậu',
    lastVerifiedAt: '2026-09-14 11:00',
    qrCodeValue: 'AST:TSN:CH-01:B1PR01',
    specs: [
      { specId: 'SP-9', parameter: 'Công suất lạnh danh định', value: '1000', unit: 'RT (3517 kW)', sourceDoc: 'Chiller Schedule', confidence: 0.99, status: 'VERIFIED' },
      { specId: 'SP-10', parameter: 'Môi chất lạnh (Refrigerant)', value: 'R-514A (Eco-friendly)', sourceDoc: 'Nameplate OCR', confidence: 0.98, status: 'VERIFIED' },
      { specId: 'SP-11', parameter: 'COP toàn tải', value: '6.85', unit: 'W/W', sourceDoc: 'Commissioning Report', confidence: 0.96, status: 'VERIFIED' }
    ],
    inspectionHistory: [
      { logId: 'LOG-301', timestamp: '2026-08-28 08:00', user: 'Trần Đình Trọng', action: 'MAINTAINED', description: 'Kiểm tra độ nhớt dầu máy nén và áp suất bốc hơi/ngưng tụ.' }
    ]
  },
  {
    assetId: 'AST-TSN-FP-01',
    assetTag: 'FP-01',
    assetName: 'Máy bơm chữa cháy chính động cơ Diesel FP-01',
    assetType: 'Bơm cứu hỏa PUMP',
    system: 'FIRE_PROTECTION',
    manufacturer: 'Ebara Corporation',
    model: 'FSA 200x150',
    serialNumber: 'EBR-JP-88123',
    floor: 'Tầng Hầm (Basement B1)',
    zone: 'Zone B - Trạm Kỹ thuật Trung tâm',
    room: 'PR-01 - Trạm Bơm & Chiller',
    cadCoordinates: {
      x: 17000,
      y: 31500,
      z: 0,
      units: 'mm',
      coordinateSystem: 'VN2000_TSN',
      sourceHandle: '7E20',
      sourceLayer: 'FP-PUMP-FIRE'
    },
    sourceDrawing: 'TSN-T2-MEP-FP-01.dxf',
    sourceRevision: 'Rev.01',
    criticality: 'HIGH',
    status: 'STANDBY',
    validationStatus: 'VERIFIED',
    confidence: 0.97,
    verifiedBy: 'Đội PCCC Cảng Hàng Không',
    lastVerifiedAt: '2026-09-12 09:00',
    qrCodeValue: 'AST:TSN:FP-01:PR01',
    specs: [
      { specId: 'SP-12', parameter: 'Lưu lượng bơm (Flow Rate)', value: '750', unit: 'GPM (170 m³/h)', sourceDoc: 'Fire Protection Schedule', confidence: 0.99, status: 'VERIFIED' },
      { specId: 'SP-13', parameter: 'Cột áp (Head)', value: '110', unit: 'm', sourceDoc: 'Fire Protection Schedule', confidence: 0.99, status: 'VERIFIED' },
      { specId: 'SP-14', parameter: 'Công suất động cơ Diesel', value: '150', unit: 'kW', sourceDoc: 'Datasheet Ebara', confidence: 0.97, status: 'VERIFIED' }
    ],
    inspectionHistory: [
      { logId: 'LOG-401', timestamp: '2026-09-12 09:00', user: 'Võ Minh Tuấn', action: 'INSPECTED', description: 'Chạy thử không tải 15 phút, áp suất đầu đẩy đạt 11.2 bar.' }
    ]
  },
  {
    assetId: 'AST-TSN-ES-01',
    assetTag: 'ES-01',
    assetName: 'Thang cuốn hành khách sảnh đến ga T2',
    assetType: 'Thang cuốn Escalator',
    system: 'ARCHITECTURE',
    manufacturer: 'Otis Elevator Company',
    model: '510NPE Heavy Duty',
    serialNumber: 'OTIS-VN-510N-004',
    floor: 'Tầng 1 (Level 1)',
    zone: 'Zone A - Cánh Đông',
    room: 'CONCOURSE-A - Sảnh Chờ Ga Đến',
    cadCoordinates: {
      x: 42000,
      y: 22000,
      z: 0,
      units: 'mm',
      coordinateSystem: 'VN2000_TSN',
      sourceHandle: '6A01',
      sourceLayer: 'ARCH-ESCALATOR'
    },
    sourceDrawing: 'TSN-T2-ARCH-01.dxf',
    sourceRevision: 'Rev.04',
    criticality: 'MEDIUM',
    status: 'OPERATIONAL',
    validationStatus: 'VERIFIED',
    confidence: 0.99,
    specs: [
      { specId: 'SP-15', parameter: 'Vận tốc định mức', value: '0.5', unit: 'm/s', sourceDoc: 'Vertical Transport Spec', confidence: 0.99, status: 'VERIFIED' },
      { specId: 'SP-16', parameter: 'Góc nghiêng', value: '30', unit: 'độ', sourceDoc: 'Shop Drawing Escalator', confidence: 0.99, status: 'VERIFIED' }
    ],
    inspectionHistory: []
  },
  {
    assetId: 'AST-TSN-WC-01',
    assetTag: 'WC-A01',
    assetName: 'Cụm thiết bị vệ sinh thông minh & cấp thoát nước tự động',
    assetType: 'Nhà vệ sinh WC',
    system: 'PLUMBING',
    manufacturer: 'TOTO / Inax Commercial',
    model: 'Touchless Sensor Suite Pro',
    serialNumber: 'TOTO-TSN-WC-001',
    floor: 'Tầng 1 (Level 1)',
    zone: 'Zone A - Cánh Đông',
    room: 'WC-A01 - Khu Vệ Sinh Công Cộng',
    cadCoordinates: {
      x: 27000,
      y: 29500,
      z: 0,
      units: 'mm',
      coordinateSystem: 'VN2000_TSN',
      sourceHandle: '5W01',
      sourceLayer: 'PLUMB-FIXTURE-WC'
    },
    sourceDrawing: 'TSN-T2-ARCH-01.dxf',
    sourceRevision: 'Rev.04',
    criticality: 'MEDIUM',
    status: 'OPERATIONAL',
    validationStatus: 'VERIFIED',
    confidence: 0.98,
    verifiedBy: 'KS. Võ Minh Tuấn (Plumbing Lead)',
    lastVerifiedAt: '2026-09-20 15:00',
    specs: [
      { specId: 'SP-17', parameter: 'Áp lực cấp nước tối thiểu', value: '1.5', unit: 'bar', sourceDoc: 'Plumbing Schedule', confidence: 0.99, status: 'VERIFIED' },
      { specId: 'SP-18', parameter: 'Hệ thống xả cảm ứng', value: 'Hồng ngoại tự động 24VDC', sourceDoc: 'Datasheet TOTO', confidence: 0.98, status: 'VERIFIED' }
    ],
    inspectionHistory: [
      { logId: 'LOG-501', timestamp: '2026-09-20 15:00', user: 'Võ Minh Tuấn', action: 'VERIFIED', description: 'Đã nghiệm thu áp lực xả và van phao cấp nước tự ngắt.' }
    ]
  }
];

export const SAMPLE_QUANTITIES: QuantityItem[] = [
  {
    quantityId: 'QTY-001',
    project: 'Sân bay Quốc tế Tân Sơn Nhất - Nhà ga T2/T3',
    drawing: 'TSN-T2-MEP-E-01.dxf',
    revision: 'Rev.03',
    floor: 'Tầng 1 (Level 1)',
    zone: 'Zone A - Cánh Đông',
    room: 'E-101',
    system: 'ELECTRICAL',
    itemCode: 'E-PANEL-MDB',
    description: 'Tủ phân phối hạ thế tổng MDB 2500A Form 4B',
    unit: 'SET',
    quantity: 1,
    formula: 'COUNT(verified_entities WHERE layer="E-PANEL-MDB") = 1',
    measurementMethod: 'COUNT',
    sourceEntities: ['8AF2'],
    confidence: 0.98,
    status: 'VERIFIED',
    unitPriceEstimate: 450000000,
    totalPriceEstimate: 450000000,
    notes: 'Đã nghiệm thu vị trí CAD và SLD'
  },
  {
    quantityId: 'QTY-002',
    project: 'Sân bay Quốc tế Tân Sơn Nhất - Nhà ga T2/T3',
    drawing: 'TSN-T2-MEP-E-01.dxf',
    revision: 'Rev.03',
    floor: 'Tầng 1 (Level 1)',
    zone: 'Zone A - Cánh Đông',
    system: 'ELECTRICAL',
    itemCode: 'E-TRAY-400x100',
    description: 'Máng cáp điện tôn mạ kẽm nhúng nóng W400xH100xT2.0mm',
    unit: 'M',
    quantity: 34.5,
    formula: 'SUM(length of LWPOLYLINE on layer="E-CABLE-TRAY-400") × 0.001 = 34,500mm × 0.001 = 34.5m',
    measurementMethod: 'LINEAR',
    sourceEntities: ['8C05'],
    confidence: 0.97,
    status: 'VERIFIED',
    unitPriceEstimate: 620000,
    totalPriceEstimate: 21390000,
    notes: 'Tuyến chính từ phòng E-101 sang Trục kỹ thuật'
  },
  {
    quantityId: 'QTY-003',
    project: 'Sân bay Quốc tế Tân Sơn Nhất - Nhà ga T2/T3',
    drawing: 'TSN-T2-MEP-M-02.dxf',
    revision: 'Rev.02',
    floor: 'Tầng 1 (Level 1)',
    zone: 'Zone A - Cánh Đông',
    system: 'HVAC',
    itemCode: 'M-DUCT-SUPPLY',
    description: 'Đường ống gió cấp tole mạ kẽm cách nhiệt bông thủy tinh dày 50mm',
    unit: 'M',
    quantity: 52.0,
    formula: 'SUM(length of LWPOLYLINE on layer="M-HVAC-DUCT-SUPPLY") × 0.001 = 52,000mm × 0.001 = 52.0m',
    measurementMethod: 'LINEAR',
    sourceEntities: ['9F12'],
    confidence: 0.97,
    status: 'VERIFIED',
    unitPriceEstimate: 850000,
    totalPriceEstimate: 44200000,
    notes: 'Tuyến cấp gió tươi từ AHU-02 tới Sảnh A'
  },
  {
    quantityId: 'QTY-004',
    project: 'Sân bay Quốc tế Tân Sơn Nhất - Nhà ga T2/T3',
    drawing: 'TSN-T2-MEP-FP-01.dxf',
    revision: 'Rev.01',
    floor: 'Tầng Hầm (Basement B1)',
    zone: 'Zone B',
    system: 'FIRE_PROTECTION',
    itemCode: 'FP-PIPE-DN150',
    description: 'Ống thép đúc tráng kẽm SCH40 chữa cháy DN150 nối rãnh (Grooved)',
    unit: 'M',
    quantity: 68.0,
    formula: 'SUM(length of LWPOLYLINE on layer="FP-SPRINKLER-MAIN-DN150") × 0.001 = 68,000mm × 0.001 = 68.0m',
    measurementMethod: 'LINEAR',
    sourceEntities: ['7E88'],
    confidence: 0.98,
    status: 'VERIFIED',
    unitPriceEstimate: 1250000,
    totalPriceEstimate: 85000000,
    notes: 'Trục cấp chính từ trạm bơm chữa cháy'
  },
  {
    quantityId: 'QTY-005',
    project: 'Sân bay Quốc tế Tân Sơn Nhất - Nhà ga T2/T3',
    drawing: 'TSN-T2-MEP-FP-01.dxf',
    revision: 'Rev.01',
    floor: 'Tầng Hầm (Basement B1)',
    zone: 'Zone B',
    room: 'PR-01',
    system: 'FIRE_PROTECTION',
    itemCode: 'FP-PUMP-DIESEL',
    description: 'Cụm máy bơm cứu hỏa động cơ Diesel 750 GPM @ 110m cột áp',
    unit: 'SET',
    quantity: 1,
    formula: 'COUNT(verified_entities WHERE layer="FP-PUMP-FIRE") = 1',
    measurementMethod: 'COUNT',
    sourceEntities: ['7E20'],
    confidence: 0.98,
    status: 'VERIFIED',
    unitPriceEstimate: 890000000,
    totalPriceEstimate: 890000000,
    notes: 'Đầy đủ van hút, van một chiều, bypass và tủ điều khiển tiêu chuẩn NFPA 20'
  },
  {
    quantityId: 'QTY-006',
    project: 'Sân bay Quốc tế Tân Sơn Nhất - Nhà ga T2/T3',
    drawing: 'TSN-T2-ARCH-01.dxf',
    revision: 'Rev.04',
    floor: 'Tầng 1 (Level 1)',
    zone: 'Zone A',
    room: 'E-101',
    system: 'ARCHITECTURE',
    itemCode: 'RM-E101-AREA',
    description: 'Diện tích sàn phòng kỹ thuật điện E-101 (Sơn Epoxy chống tĩnh điện)',
    unit: 'M2',
    quantity: 84.5,
    formula: 'Shoelace_Polygon_Area([4 vertices]) × (0.001)² = 84,500,000 mm² × 1e-6 = 84.5 m²',
    measurementMethod: 'AREA',
    sourceEntities: ['RM-E101'],
    confidence: 0.99,
    status: 'VERIFIED',
    unitPriceEstimate: 350000,
    totalPriceEstimate: 29575000,
    notes: 'Khép góc đa giác chuẩn 100%'
  }
];

export const SAMPLE_PROJECT: Project = {
  projectId: 'PRJ-TSN-T2',
  name: 'Sân bay Quốc tế Tân Sơn Nhất - Nhà ga T2/T3 Phân khu Kỹ thuật',
  code: 'TSN-T2-MEP-2026',
  location: 'Sân bay Quốc tế Tân Sơn Nhất, Phường 2, Tân Bình, TP. Hồ Chí Minh',
  description: 'Hệ thống hạ tầng cơ điện (MEP), điều hòa thông gió HVAC, trạm biến áp, phòng cháy chữa cháy và Digital Twin mặt bằng nhà ga.',
  totalFloors: 4,
  drawingsCount: 5,
  assetsCount: 5,
  takeoffCount: 6,
  drawings: [
    {
      drawingId: 'DRW-E01',
      drawingNumber: 'TSN-T2-MEP-E-01',
      title: 'Mặt bằng bố trí thiết bị điện & máng cáp Tầng 1 - Cánh Đông',
      discipline: 'ELECTRICAL',
      floor: 'Tầng 1 (Level 1)',
      zone: 'Zone A',
      currentRevision: 'Rev.03',
      scale: '1:100',
      units: 'mm',
      revisions: [
        { revisionId: 'REV-01', revisionName: 'Rev.01', date: '2026-03-10', author: 'KS. Hoàng Long', changesSummary: 'Bản vẽ phát hành sơ bộ thiết kế kỹ thuật', entitiesCount: 120, totalQuantity: 28, status: 'ARCHIVED' },
        { revisionId: 'REV-02', revisionName: 'Rev.02', date: '2026-05-20', author: 'KS. Hoàng Long', changesSummary: 'Điều chỉnh vị trí tủ DB và mở rộng máng cáp 400mm', entitiesCount: 135, totalQuantity: 34.5, status: 'ARCHIVED' },
        { revisionId: 'REV-03', revisionName: 'Rev.03', date: '2026-08-15', author: 'KS. Nguyễn Văn Hậu', changesSummary: 'Bản vẽ hoàn công As-built phê duyệt nghiệm thu', entitiesCount: 142, totalQuantity: 35.5, status: 'ACTIVE' }
      ],
      entities: SAMPLE_ENTITIES.filter(e => e.discipline === 'ELECTRICAL'),
      rooms: SAMPLE_ROOMS.filter(r => r.servingSystems.includes('ELECTRICAL'))
    },
    {
      drawingId: 'DRW-M02',
      drawingNumber: 'TSN-T2-MEP-M-02',
      title: 'Mặt bằng hệ thống HVAC & đường ống nước lạnh Tầng 1',
      discipline: 'HVAC',
      floor: 'Tầng 1 (Level 1)',
      zone: 'Zone A',
      currentRevision: 'Rev.02',
      scale: '1:100',
      units: 'mm',
      revisions: [
        { revisionId: 'REV-01', revisionName: 'Rev.01', date: '2026-04-05', author: 'KS. Trần Đình Trọng', changesSummary: 'Thiết kế hệ thống đường ống gió cấp', entitiesCount: 88, totalQuantity: 45.0, status: 'ARCHIVED' },
        { revisionId: 'REV-02', revisionName: 'Rev.02', date: '2026-07-12', author: 'KS. Trần Đình Trọng', changesSummary: 'Gia tăng lưu lượng AHU-02 lên 28000 m3/h', entitiesCount: 96, totalQuantity: 52.0, status: 'ACTIVE' }
      ],
      entities: SAMPLE_ENTITIES.filter(e => e.discipline === 'HVAC'),
      rooms: SAMPLE_ROOMS.filter(r => r.servingSystems.includes('HVAC'))
    }
  ]
};
