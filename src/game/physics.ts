import { rectOverlap, type Rect } from '../engine/math';
import type { TileRect } from './types';

export interface MoveOptions {
  ignoreOneWay?: boolean;
  allowCrackedBreak?: boolean;
}

export interface MoveResult {
  grounded: boolean;
  hitCeiling: boolean;
  hitWallLeft: boolean;
  hitWallRight: boolean;
  hitSpike: boolean;
  hitCrackedIds: string[];
}

/**
 * Axis-separated AABB swept/stepped collision against level tiles.
 * Supports solid walls, drop-through one-way platforms, breakable cracked floors,
 * and spike hazard overlap checks.
 */
export function moveAndCollide(
  entity: Rect,
  vx: number,
  vy: number,
  dt: number,
  tiles: TileRect[],
  options: MoveOptions = {},
): MoveResult {
  const result: MoveResult = {
    grounded: false,
    hitCeiling: false,
    hitWallLeft: false,
    hitWallRight: false,
    hitSpike: false,
    hitCrackedIds: [],
  };

  // Horizontal step
  entity.x += vx * dt;
  for (const tile of tiles) {
    if (tile.broken) continue;
    if (tile.kind !== 'solid' && tile.kind !== 'cracked') continue;
    if (!rectOverlap(entity, tile)) continue;

    if (vx > 0) {
      entity.x = tile.x - entity.w;
      result.hitWallRight = true;
    } else if (vx < 0) {
      entity.x = tile.x + tile.w;
      result.hitWallLeft = true;
    }
  }

  // Vertical step
  const prevBottom = entity.y + entity.h;
  entity.y += vy * dt;

  for (const tile of tiles) {
    if (tile.broken) continue;

    if (tile.kind === 'spike') {
      continue;
    }

    if (tile.kind === 'oneway') {
      if (options.ignoreOneWay || vy < 0) continue;
      if (prevBottom <= tile.y + 6 && rectOverlap(entity, tile)) {
        entity.y = tile.y - entity.h;
        result.grounded = true;
      }
      continue;
    }

    if (!rectOverlap(entity, tile)) continue;

    if (vy >= 0) {
      if (tile.kind === 'cracked' && options.allowCrackedBreak) {
        result.hitCrackedIds.push(tile.id);
        continue;
      }
      entity.y = tile.y - entity.h;
      result.grounded = true;
    } else {
      entity.y = tile.y + tile.h;
      result.hitCeiling = true;
    }
  }

  // Check spike overlap slightly inset for fair platformer feel
  const hurtBox: Rect = {
    x: entity.x + 3,
    y: entity.y + 3,
    w: Math.max(4, entity.w - 6),
    h: Math.max(4, entity.h - 4),
  };

  for (const tile of tiles) {
    if (tile.kind === 'spike' && !tile.broken && rectOverlap(hurtBox, tile)) {
      result.hitSpike = true;
      break;
    }
  }

  return result;
}

export function isPointInsideSolidTile(x: number, y: number, tiles: TileRect[]): boolean {
  for (const tile of tiles) {
    if (tile.broken) continue;
    if (tile.kind !== 'solid' && tile.kind !== 'cracked') continue;
    if (x >= tile.x && x <= tile.x + tile.w && y >= tile.y && y <= tile.y + tile.h) {
      return true;
    }
  }
  return false;
}
