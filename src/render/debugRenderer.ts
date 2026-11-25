import { degToRad, rectCenter } from '../engine/math';
import { getActiveLanceHitbox } from '../game/dragoonAbilities';
import type { WorldState } from '../game/types';

export interface DebugRenderOptions {
  showHitboxes: boolean;
  showLockCone: boolean;
  showStateInfo: boolean;
}

export function renderDebugOverlay(
  ctx: CanvasRenderingContext2D,
  world: WorldState,
  opts: DebugRenderOptions,
): void {
  const { player, tuning } = world;
  const pc = rectCenter(player);

  if (opts.showLockCone && player.state !== 'HJ_APEX') {
    ctx.save();
    const halfRad = degToRad(tuning.hjLockOnHalfAngleDeg);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pc.x, pc.y);
    ctx.arc(pc.x, pc.y, tuning.hjLockOnRange, Math.PI * 0.5 - halfRad, Math.PI * 0.5 + halfRad);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  if (opts.showHitboxes) {
    ctx.save();
    // Player Hurtbox (cyan if i-framed, green otherwise)
    ctx.strokeStyle = player.invulnTimer > 0 ? '#38bdf8' : '#22c55e';
    ctx.lineWidth = 2;
    ctx.strokeRect(player.x, player.y, player.w, player.h);

    // Active Player Attack Hitbox
    const hitbox = getActiveLanceHitbox(player, tuning);
    if (hitbox) {
      ctx.fillStyle = hitbox.armorBreak
        ? 'rgba(244, 63, 94, 0.28)'
        : 'rgba(251, 191, 36, 0.28)';
      ctx.strokeStyle = hitbox.armorBreak ? '#f43f5e' : '#fbbf24';
      ctx.fillRect(hitbox.rect.x, hitbox.rect.y, hitbox.rect.w, hitbox.rect.h);
      ctx.strokeRect(hitbox.rect.x, hitbox.rect.y, hitbox.rect.w, hitbox.rect.h);
    }

    // Enemy Hurtboxes
    for (const enemy of world.enemies) {
      if (!enemy.alive) continue;
      ctx.strokeStyle = enemy.frontShield ? '#60a5fa' : '#fb7185';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(enemy.x, enemy.y, enemy.w, enemy.h);
    }

    // Projectiles
    for (const proj of world.projectiles) {
      ctx.strokeStyle = proj.owner === 'player' ? '#38bdf8' : '#fb923c';
      ctx.strokeRect(proj.x, proj.y, proj.w, proj.h);
    }

    // Velocity vector
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pc.x, pc.y);
    ctx.lineTo(pc.x + player.vx * 0.14, pc.y + player.vy * 0.14);
    ctx.stroke();
    ctx.restore();
  }

  if (opts.showStateInfo) {
    ctx.save();
    ctx.font = '600 11px monospace';
    ctx.textAlign = 'center';
    const text = `${player.state} | vx:${Math.round(player.vx)} vy:${Math.round(player.vy)} | inv:${player.invulnTimer.toFixed(2)}`;
    const tw = ctx.measureText(text).width + 12;
    ctx.fillStyle = 'rgba(11, 15, 26, 0.85)';
    ctx.fillRect(pc.x - tw * 0.5, player.y - 30, tw, 18);
    ctx.fillStyle = '#7dd3fc';
    ctx.fillText(text, pc.x, player.y - 17);
    ctx.restore();
  }
}
