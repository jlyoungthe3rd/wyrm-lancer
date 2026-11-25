import { getCameraShakeOffset } from '../engine/camera';
import { rectCenter } from '../engine/math';
import type { WorldState } from '../game/types';
import { renderDebugOverlay, type DebugRenderOptions } from './debugRenderer';
import { renderDragoon } from './dragoonRenderer';
import { renderEnemies } from './enemyRenderer';

function renderBackdrop(
  ctx: CanvasRenderingContext2D,
  camX: number,
  viewW: number,
  viewH: number,
): void {
  const sky = ctx.createLinearGradient(0, 0, 0, viewH);
  sky.addColorStop(0, '#070b14');
  sky.addColorStop(0.55, '#111b33');
  sky.addColorStop(1, '#18223d');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, viewW, viewH);

  // Subtle Moon
  ctx.save();
  const moonX = 960 - camX * 0.04;
  ctx.fillStyle = 'rgba(186, 230, 253, 0.16)';
  ctx.beginPath();
  ctx.arc(moonX, 130, 56, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(224, 242, 254, 0.35)';
  ctx.beginPath();
  ctx.arc(moonX, 130, 34, 0, Math.PI * 2);
  ctx.fill();

  // Parallax Distant Citadel Spires
  ctx.fillStyle = '#0c1324';
  for (let i = 0; i < 16; i++) {
    const spireX = ((i * 220 - camX * 0.18) % (viewW + 440)) - 120;
    const spireH = 190 + ((i * 73) % 160);
    ctx.beginPath();
    ctx.moveTo(spireX, viewH);
    ctx.lineTo(spireX + 18, viewH - spireH);
    ctx.lineTo(spireX + 42, viewH - spireH - 55);
    ctx.lineTo(spireX + 66, viewH - spireH);
    ctx.lineTo(spireX + 86, viewH);
    ctx.closePath();
    ctx.fill();
  }

  // Midground Pillars
  ctx.fillStyle = '#131d36';
  for (let i = 0; i < 12; i++) {
    const pX = ((i * 310 - camX * 0.35) % (viewW + 620)) - 140;
    const pH = 110 + ((i * 97) % 120);
    ctx.fillRect(pX, viewH - pH, 48, pH);
  }
  ctx.restore();
}

function renderTiles(ctx: CanvasRenderingContext2D, world: WorldState): void {
  const cam = world.camera;
  for (const tile of world.tiles) {
    if (tile.broken) continue;
    if (
      tile.x + tile.w < cam.x - 40 ||
      tile.x > cam.x + cam.viewW + 40 ||
      tile.y + tile.h < cam.y - 40 ||
      tile.y > cam.y + cam.viewH + 40
    ) {
      continue;
    }

    if (tile.kind === 'solid') {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(tile.x, tile.y, tile.w, tile.h);
      ctx.fillStyle = '#334155';
      ctx.fillRect(tile.x, tile.y, tile.w, Math.min(8, tile.h));
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
      ctx.lineWidth = 1;
      ctx.strokeRect(tile.x + 0.5, tile.y + 0.5, tile.w - 1, tile.h - 1);
    } else if (tile.kind === 'oneway') {
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(tile.x, tile.y, tile.w, 6);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(tile.x + 4, tile.y + 6, tile.w - 8, tile.h - 6);
    } else if (tile.kind === 'cracked') {
      ctx.fillStyle = '#475569';
      ctx.fillRect(tile.x, tile.y, tile.w, tile.h);
      // Glowing cyan fissures indicating High Jump dive breakable
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tile.x + 10, tile.y + 2);
      ctx.lineTo(tile.x + tile.w * 0.45, tile.y + tile.h * 0.55);
      ctx.lineTo(tile.x + tile.w * 0.75, tile.y + tile.h - 3);
      ctx.moveTo(tile.x + tile.w * 0.65, tile.y + 4);
      ctx.lineTo(tile.x + tile.w * 0.45, tile.y + tile.h * 0.55);
      ctx.stroke();
    } else if (tile.kind === 'spike') {
      const spikeW = 16;
      const count = Math.max(1, Math.floor(tile.w / spikeW));
      ctx.fillStyle = '#f43f5e';
      ctx.strokeStyle = '#fda4af';
      ctx.lineWidth = 1;
      for (let i = 0; i < count; i++) {
        const sx = tile.x + i * spikeW;
        ctx.beginPath();
        ctx.moveTo(sx, tile.y + tile.h);
        ctx.lineTo(sx + spikeW * 0.5, tile.y);
        ctx.lineTo(sx + spikeW, tile.y + tile.h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  }
}

function renderSignposts(ctx: CanvasRenderingContext2D, world: WorldState): void {
  const pc = rectCenter(world.player);

  for (const sign of world.signposts) {
    // Stone tablet pedestal
    ctx.fillStyle = '#334155';
    ctx.fillRect(sign.x - 10, sign.y - 34, 20, 34);
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(sign.x - 6, sign.y - 29, 12, 6);

    const d = Math.hypot(pc.x - sign.x, pc.y - (sign.y - 20));
    const nearby = d < 320;
    const alpha = nearby ? 0.94 : 0.42;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '700 11px "Segoe UI", sans-serif';
    const w = Math.max(
      ctx.measureText(sign.title).width,
      ...sign.lines.map((l) => ctx.measureText(l).width),
    ) + 22;
    const h = 24 + sign.lines.length * 16;
    const bx = sign.x - w * 0.2;
    const by = sign.y - 46 - h;

    ctx.fillStyle = 'rgba(11, 15, 26, 0.86)';
    ctx.strokeStyle = nearby ? 'rgba(56, 189, 248, 0.7)' : 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bx, by, w, h, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.fillText(sign.title, bx + 11, by + 16);

    ctx.font = '500 11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#e2e8f0';
    for (let i = 0; i < sign.lines.length; i++) {
      ctx.fillText(sign.lines[i], bx + 11, by + 33 + i * 16);
    }
    ctx.restore();
  }
}

function renderProjectilesAndVfx(ctx: CanvasRenderingContext2D, world: WorldState): void {
  // Projectiles
  for (const proj of world.projectiles) {
    ctx.save();
    if (proj.kind === 'lancet') {
      const c = rectCenter(proj);
      const angle = Math.atan2(proj.vy, proj.vx);
      ctx.translate(c.x, c.y);
      ctx.rotate(angle);
      ctx.fillStyle = '#34d399';
      ctx.strokeStyle = '#a7f3d0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-14, -6);
      ctx.lineTo(-8, 0);
      ctx.lineTo(-14, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (proj.kind === 'geirskogul') {
      const grad = ctx.createLinearGradient(proj.x, proj.y, proj.x + proj.w, proj.y);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
      grad.addColorStop(0.5, '#38bdf8');
      grad.addColorStop(1, '#f43f5e');
      ctx.fillStyle = grad;
      ctx.fillRect(proj.x, proj.y, proj.w, proj.h);
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(proj.x + 6, proj.y + proj.h * 0.32, proj.w - 12, proj.h * 0.36);
    } else if (proj.kind === 'turret_wave' || proj.kind === 'boss_flame') {
      ctx.fillStyle = proj.kind === 'boss_flame' ? '#f43f5e' : '#fb923c';
      ctx.beginPath();
      ctx.roundRect(proj.x, proj.y, proj.w, proj.h, 8);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(proj.x + 6, proj.y + 6, proj.w - 12, proj.h - 12);
    } else {
      const c = rectCenter(proj);
      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.arc(c.x, c.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Drain Orbs
  for (const orb of world.drainOrbs) {
    ctx.save();
    ctx.fillStyle = '#34d399';
    ctx.shadowColor = '#34d399';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Shockwaves
  for (const sw of world.shockwaves) {
    ctx.save();
    ctx.globalAlpha = sw.alpha;
    ctx.strokeStyle = sw.color;
    ctx.lineWidth = sw.isStardiver ? 6 : 3.5;
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
    ctx.stroke();
    if (sw.isStardiver) {
      ctx.fillStyle = 'rgba(244, 63, 94, 0.22)';
      ctx.fill();
    }
    ctx.restore();
  }

  // Particles
  for (const p of world.particles) {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size);
    ctx.restore();
  }

  // Floating Combat Texts
  for (const ft of world.floatingTexts) {
    const alpha = Math.max(0, 1 - ft.life / ft.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `800 ${Math.round(13 * ft.scale)}px "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(2, 6, 23, 0.85)';
    ctx.lineWidth = 3;
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
}

export function renderWorld(
  ctx: CanvasRenderingContext2D,
  world: WorldState,
  debugOpts: DebugRenderOptions,
): void {
  const cam = world.camera;
  const shake = getCameraShakeOffset(cam);

  renderBackdrop(ctx, cam.x, cam.viewW, cam.viewH);

  ctx.save();
  ctx.translate(-Math.round(cam.x + shake.x), -Math.round(cam.y + shake.y));

  renderSignposts(ctx, world);
  renderTiles(ctx, world);
  renderEnemies(ctx, world);
  renderDragoon(ctx, world);
  renderProjectilesAndVfx(ctx, world);
  renderDebugOverlay(ctx, world, debugOpts);

  ctx.restore();
}
