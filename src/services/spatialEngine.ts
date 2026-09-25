/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Room, CADCoordinates } from '../types';

/**
 * Calculates polygon area using the Shoelace formula (Gauss's area formula).
 * Units returned match coordinate units squared (e.g. mm² -> m² if divided by 10^6).
 */
export const calculateShoelaceArea = (points: Array<{ x: number; y: number }>): number => {
  if (points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
};

/**
 * Calculates polygon perimeter.
 */
export const calculatePerimeter = (points: Array<{ x: number; y: number }>): number => {
  if (points.length < 2) return 0;
  let perimeter = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const dx = points[j].x - points[i].x;
    const dy = points[j].y - points[i].y;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }
  return perimeter;
};

/**
 * Checks whether point (x, y) is inside a closed polygon using Ray-Casting algorithm.
 */
export const isPointInPolygon = (
  point: { x: number; y: number },
  polygon: Array<{ x: number; y: number }>
): boolean => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

/**
 * Finds the containing room for a given CAD coordinate.
 */
export const findRoomForCADCoordinate = (
  coord: { x: number; y: number },
  rooms: Room[]
): Room | null => {
  for (const room of rooms) {
    if (room.polygon && room.polygon.length >= 3) {
      if (isPointInPolygon(coord, room.polygon)) {
        return room;
      }
    }
  }
  return null;
};

/**
 * Euclidean distance in 2D space.
 */
export const getEuclideanDistance = (
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
};
