/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CADEntity, QuantityItem, Room, ValidationStatus } from '../types';
import { calculateShoelaceArea } from './spatialEngine';

export interface TakeoffCalculationParams {
  system: string;
  itemType: string;
  floor: string;
  zone: string;
  room?: string;
  scaleFactor?: number; // e.g. 1.0 or 0.001 for mm -> m
}

/**
 * Deduplicate CAD entities within an epsilon distance (e.g. 50mm) to prevent double counting.
 */
export const deduplicateEntities = (entities: CADEntity[], epsilon = 50): CADEntity[] => {
  const unique: CADEntity[] = [];
  for (const entity of entities) {
    const isDuplicate = unique.some(u => {
      const dx = Math.abs(u.coordinates.x - entity.coordinates.x);
      const dy = Math.abs(u.coordinates.y - entity.coordinates.y);
      return dx < epsilon && dy < epsilon && u.entityType === entity.entityType;
    });
    if (!isDuplicate) {
      unique.push(entity);
    }
  }
  return unique;
};

/**
 * Calculate quantity for Count type items (e.g. electrical panels, valves, sprinklers, diffusers, pumps).
 */
export const calculateCountTakeoff = (
  entities: CADEntity[],
  itemCode: string,
  description: string,
  system: any,
  floor: string,
  zone: string,
  drawing: string,
  revision: string,
  room?: string
): QuantityItem => {
  const deduped = deduplicateEntities(entities);
  const count = deduped.length;
  const handles = deduped.map(e => e.cadHandle);

  return {
    quantityId: `QTY-CNT-${Date.now().toString().slice(-6)}`,
    project: 'Sân bay Quốc tế Tân Sơn Nhất - Ga T2/T3',
    drawing,
    revision,
    floor,
    zone,
    room,
    system,
    itemCode,
    description,
    unit: 'PCS',
    quantity: count,
    formula: `COUNT(verified_entities) = ${count} pcs (Deduplication threshold: 50mm)`,
    measurementMethod: 'COUNT',
    sourceEntities: handles,
    confidence: count > 0 ? 0.98 : 0.85,
    status: 'VERIFIED'
  };
};

/**
 * Calculate linear length for Duct, Cable Tray, Pipe entities.
 */
export const calculateLinearTakeoff = (
  entities: CADEntity[],
  itemCode: string,
  description: string,
  system: any,
  floor: string,
  zone: string,
  drawing: string,
  revision: string,
  scaleFactor = 0.001 // convert mm to meters
): QuantityItem => {
  let totalLengthMm = 0;
  const handles: string[] = [];

  entities.forEach(ent => {
    handles.push(ent.cadHandle);
    if (ent.length) {
      totalLengthMm += ent.length;
    } else if (ent.vertices && ent.vertices.length >= 2) {
      for (let i = 0; i < ent.vertices.length - 1; i++) {
        const dx = ent.vertices[i + 1].x - ent.vertices[i].x;
        const dy = ent.vertices[i + 1].y - ent.vertices[i].y;
        totalLengthMm += Math.sqrt(dx * dx + dy * dy);
      }
    }
  });

  const totalLengthM = Number((totalLengthMm * scaleFactor).toFixed(2));

  return {
    quantityId: `QTY-LIN-${Date.now().toString().slice(-6)}`,
    project: 'Sân bay Quốc tế Tân Sơn Nhất - Ga T2/T3',
    drawing,
    revision,
    floor,
    zone,
    system,
    itemCode,
    description,
    unit: 'M',
    quantity: totalLengthM,
    formula: `SUM(entity_length × ${scaleFactor}) = ${totalLengthMm}mm × ${scaleFactor} = ${totalLengthM}m`,
    measurementMethod: 'LINEAR',
    sourceEntities: handles,
    confidence: 0.97,
    status: 'VERIFIED'
  };
};

/**
 * Calculate area from room polygons or hatch entities.
 */
export const calculateAreaTakeoff = (
  room: Room,
  scaleFactor = 0.001 // mm to m (area = scaleFactor^2)
): QuantityItem => {
  const areaM2 = Number(room.areaSqm.toFixed(2));

  return {
    quantityId: `QTY-ARA-${room.roomId}`,
    project: 'Sân bay Quốc tế Tân Sơn Nhất - Ga T2/T3',
    drawing: room.sourceFile,
    revision: room.sourceRevision,
    floor: room.floor,
    zone: room.zone,
    room: `${room.roomNumber} - ${room.roomName}`,
    system: 'ARCHITECTURE',
    itemCode: `ROOM-ARA-${room.roomNumber}`,
    description: `Diện tích sàn phòng kỹ thuật: ${room.roomName}`,
    unit: 'M2',
    quantity: areaM2,
    formula: `Shoelace_Polygon_Area(${room.polygon.length} vertices) × (${scaleFactor})² = ${areaM2} m²`,
    measurementMethod: 'AREA',
    sourceEntities: [`RM-${room.roomId}`],
    confidence: room.boundaryStatus === 'CLOSED_POLYGON' ? 0.99 : 0.88,
    status: room.boundaryStatus === 'CLOSED_POLYGON' ? 'VERIFIED' : 'NEED_REVIEW'
  };
};
