/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ValidationStatus = 'VERIFIED' | 'NEED_REVIEW' | 'CONFLICT' | 'NOT_FOUND';
export type MatchStatus = 'EXACT_QR' | 'EXACT_TAG' | 'HIGH_CONFIDENCE' | 'CANDIDATE' | 'NEED_REVIEW' | 'NOT_FOUND';
export type SystemDiscipline = 'ELECTRICAL' | 'HVAC' | 'PLUMBING' | 'FIRE_PROTECTION' | 'BMS' | 'ARCHITECTURE' | 'STRUCTURAL';

export interface CADCoordinates {
  x: number;
  y: number;
  z?: number;
  units: 'mm' | 'm';
  coordinateSystem: string; // e.g. 'VN2000' | 'LOCAL_PROJECT_ORIGIN'
  sourceHandle?: string;
  sourceLayer?: string;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface CADEntity {
  entityId: string;
  cadHandle: string;
  entityType: 'LINE' | 'LWPOLYLINE' | 'POLYLINE' | 'ARC' | 'CIRCLE' | 'TEXT' | 'MTEXT' | 'INSERT' | 'DIMENSION';
  layer: string;
  discipline: SystemDiscipline;
  blockName?: string;
  text?: string;
  coordinates: CADCoordinates;
  bbox: BoundingBox;
  length?: number;
  area?: number;
  radius?: number;
  vertices?: Array<{ x: number; y: number }>;
  color?: string;
  attributes?: Record<string, string>;
  sourceFile: string;
  sourceRevision: string;
  isAsset?: boolean;
  assetTag?: string;
}

export interface Room {
  roomId: string;
  roomNumber: string;
  roomName: string;
  floor: string;
  zone: string;
  areaSqm: number;
  perimeterM: number;
  polygon: Array<{ x: number; y: number }>; // in CAD coordinates
  boundaryStatus: 'CLOSED_POLYGON' | 'TEXT_BBOX_CANDIDATE';
  sourceFile: string;
  sourceRevision: string;
  servingSystems: SystemDiscipline[];
  assetCount?: number;
}

export interface TechnicalSpec {
  specId: string;
  parameter: string; // e.g., 'Rated Voltage', 'Capacity', 'Refrigerant', 'Motor kW'
  value: string;
  unit?: string;
  sourceDoc: string;
  page?: number;
  confidence: number;
  status: 'VERIFIED' | 'INFERRED' | 'CONFLICT';
}

export interface MaintenanceLog {
  logId: string;
  timestamp: string;
  user: string;
  action: 'CREATED' | 'INSPECTED' | 'MAINTAINED' | 'REPAIRED' | 'VERIFIED' | 'LOCATION_UPDATED' | 'IMPORTED';
  description: string;
  reportRef?: string;
  photoUrl?: string;
}

export interface Asset {
  assetId: string;
  assetTag: string;
  assetName: string;
  assetType: string; // e.g. 'Tủ điện MDB', 'Máy lạnh AHU', 'Máy bơm PUMP', 'Thang cuốn'
  system: SystemDiscipline;
  manufacturer: string;
  model: string;
  serialNumber?: string;
  floor: string;
  zone: string;
  room: string;
  cadCoordinates: CADCoordinates;
  sourceDrawing: string;
  sourceRevision: string;
  specs: TechnicalSpec[];
  criticality: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPERATIONAL' | 'STANDBY' | 'MAINTENANCE_REQUIRED' | 'FAULT';
  validationStatus: ValidationStatus;
  confidence: number;
  verifiedBy?: string;
  lastVerifiedAt?: string;
  referencePhotoUrl?: string;
  inspectionHistory: MaintenanceLog[];
  qrCodeValue?: string;
}

export interface QuantityItem {
  quantityId: string;
  project: string;
  drawing: string;
  revision: string;
  floor: string;
  zone: string;
  room?: string;
  system: SystemDiscipline;
  itemCode: string;
  description: string;
  unit: 'PCS' | 'M' | 'M2' | 'M3' | 'SET';
  quantity: number;
  formula: string;
  measurementMethod: 'COUNT' | 'LINEAR' | 'AREA' | 'VOLUME' | 'AI_INFERENCE';
  sourceEntities: string[]; // CAD handles
  confidence: number;
  status: ValidationStatus;
  unitPriceEstimate?: number;
  totalPriceEstimate?: number;
  notes?: string;
}

export interface PhotoMatchCandidate {
  asset: Asset;
  similarityScore: number;
  evidence: string[];
  rank: number;
  tagOCR?: string;
  modelOCR?: string;
}

export interface PhotoAnalysisResult {
  photoId: string;
  timestamp: string;
  imageUrl: string;
  ocrDetectedText: string[];
  detectedQR?: string;
  detectedBrand?: string;
  detectedModel?: string;
  matchStatus: MatchStatus;
  candidates: PhotoMatchCandidate[];
  inferredRoom?: string;
  inferredFloor?: string;
}

export interface DrawingRevision {
  revisionId: string;
  revisionName: string;
  date: string;
  author: string;
  changesSummary: string;
  entitiesCount: number;
  totalQuantity: number;
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface Drawing {
  drawingId: string;
  drawingNumber: string;
  title: string;
  discipline: SystemDiscipline;
  floor: string;
  zone: string;
  currentRevision: string;
  scale: string;
  units: 'mm' | 'm';
  revisions: DrawingRevision[];
  cadFileUrl?: string;
  svgPreviewUrl?: string;
  entities: CADEntity[];
  rooms: Room[];
}

export interface Project {
  projectId: string;
  name: string;
  code: string;
  location: string;
  description: string;
  totalFloors: number;
  drawingsCount: number;
  assetsCount: number;
  takeoffCount: number;
  drawings: Drawing[];
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  targetType: 'ASSET' | 'QUANTITY' | 'DRAWING' | 'WORKSPACE_SYNC';
  targetId: string;
  details: string;
}
