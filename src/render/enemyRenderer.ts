import { rectCenter } from '../engine/math';
import type { Enemy, WorldState } from '../game/types';

function drawHpBar(ctx: CanvasRenderingContext2D, enemy: Enemy): void {
  if (enemy.indestructible || enemy.hp >= enemy.maxHp) return;
  const barW = Math.max(28, enemy.w);
  const bx = enemy.x + enemy.w * 0.5 - barW * 0.5;
  const by = enemy.y - 10;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(bx, by, barW, 5);
  ctx.fillStyle = '#f43f5e';
  ctx.fillRect(bx, by, barW * (enemy.hp / enemy.maxHp), 5);
}

export function renderEnemies(ctx: CanvasRenderingContext2D, world: WorldState): void {
  for (const enemy of world.enemies) {
    if (!enemy.alive) continue;
    const c = rectCenter(enemy);
    const flash = enemy.hitFlashTimer > 0;
    const telegraphing = enemy.aiState === 'TELEGRAPH';

    ctx.save();

    switch (enemy.kind) {
      case 'dummy': {
        ctx.fillStyle = flash ? '#ffffff' : '#78350f';
        ctx.fillRect(c.x - 4, enemy.y + 10, 8, enemy.h - 10);
        ctx.fillStyle = flash ? '#fef08a' : '#d97706';
        ctx.fillRect(enemy.x + 2, enemy.y + 14, enemy.w - 4, 18);
        ctx.beginPath();
        ctx.arc(c.x, enemy.y + 9, 9, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'lantern': {
        const glow = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, 24);
        glow.addColorStop(0, flash ? 'rgba(255,255,255,0.9)' : 'rgba(56, 189, 248, 0.55)');
        glow.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 24, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = flash ? '#ffffff' : '#0ea5e9';
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'beetle': {
        ctx.fillStyle = flash ? '#ffffff' : '#6366f1';
        ctx.beginPath();
        ctx.ellipse(c.x, enemy.y + enemy.h * 0.6, enemy.w * 0.5, enemy.h * 0.45, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#a5b4fc';
        ctx.fillRect(enemy.x + 4, enemy.y + enemy.h - 6, enemy.w - 8, 6);
        // Shell ridge
        ctx.strokeStyle = '#e0e7ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(c.x - 8, enemy.y + 6);
        ctx.lineTo(c.x, enemy.y - 2);
        ctx.lineTo(c.x + 8, enemy.y + 6);
        ctx.stroke();
        break;
      }

      case 'shield_knight': {
        ctx.fillStyle = flash ? '#ffffff' : '#475569';
        ctx.fillRect(enemy.x + 6, enemy.y + 10, enemy.w - 12, enemy.h - 10);
        // Helm
        ctx.fillStyle = flash ? '#ffffff' : '#64748b';
        ctx.fillRect(enemy.x + 8, enemy.y, enemy.w - 16, 14);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(enemy.facing === 1 ? c.x + 2 : c.x - 7, enemy.y + 5, 5, 3);

        // Front Tower Shield
        const shieldX = enemy.facing === 1 ? enemy.x + enemy.w - 8 : enemy.x;
        ctx.fillStyle = flash ? '#ffffff' : '#3b82f6';
        ctx.strokeStyle = '#93c5fd';
        ctx.lineWidth = 2;
        ctx.fillRect(shieldX, enemy.y + 6, 8, enemy.h - 10);
        ctx.strokeRect(shieldX, enemy.y + 6, 8, enemy.h - 10);
        break;
      }

      case 'turret': {
        ctx.fillStyle = flash ? '#ffffff' : '#334155';
        ctx.fillRect(enemy.x, enemy.y + 4, enemy.w, enemy.h - 4);
        ctx.fillStyle = telegraphing ? '#fb923c' : '#f43f5e';
        ctx.beginPath();
        ctx.arc(c.x + enemy.facing * 7, c.y, 7, 0, Math.PI * 2);
        ctx.fill();

        if (telegraphing) {
          ctx.strokeStyle = 'rgba(251, 146, 60, 0.55)';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.moveTo(c.x + enemy.facing * 12, c.y);
          ctx.lineTo(c.x + enemy.facing * 420, c.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        break;
      }

      case 'sentinel': {
        const bodyColor = flash ? '#ffffff' : telegraphing ? '#fb923c' : '#7c3aed';
        ctx.fillStyle = bodyColor;
        ctx.fillRect(enemy.x + 4, enemy.y + 10, enemy.w - 8, enemy.h - 10);
        ctx.fillStyle = '#c4b5fd';
        ctx.fillRect(enemy.x + 8, enemy.y, enemy.w - 16, 14);
        // Forward spear
        ctx.strokeStyle = telegraphing ? '#fef08a' : '#e2e8f0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(c.x + enemy.facing * 32, c.y);
        ctx.stroke();

        if (telegraphing) {
          ctx.strokeStyle = 'rgba(251, 146, 60, 0.7)';
          ctx.lineWidth = 2;
          ctx.strokeRect(enemy.x - 4, enemy.y - 4, enemy.w + 8, enemy.h + 8);
        }
        break;
      }

      case 'wyvern': {
        const wingFlap = Math.sin(world.time * 12 + enemy.hoverPhase) * 10;
        ctx.fillStyle = flash ? '#ffffff' : telegraphing ? '#fb923c' : '#059669';
        // Wings
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(c.x - 24, c.y - 14 + wingFlap);
        ctx.lineTo(c.x - 10, c.y + 6);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(c.x + 24, c.y - 14 + wingFlap);
        ctx.lineTo(c.x + 10, c.y + 6);
        ctx.closePath();
        ctx.fill();

        // Body
        ctx.beginPath();
        ctx.ellipse(c.x, c.y + 2, 16, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = telegraphing ? '#fef08a' : '#34d399';
        ctx.fillRect(c.x + enemy.facing * 8, c.y - 4, 6, 5);
        break;
      }

      case 'crystal': {
        const pulse = 0.7 + Math.sin(world.time * 4) * 0.3;
        const grad = ctx.createRadialGradient(c.x, c.y, 4, c.x, c.y, 42);
        grad.addColorStop(0, `rgba(244, 63, 94, ${0.45 * pulse})`);
        grad.addColorStop(1, 'rgba(244, 63, 94, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 42, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = flash ? '#ffffff' : '#e11d48';
        ctx.strokeStyle = '#fda4af';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(c.x, enemy.y);
        ctx.lineTo(enemy.x + enemy.w, c.y);
        ctx.lineTo(c.x, enemy.y + enemy.h);
        ctx.lineTo(enemy.x, c.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'iron_wyvern_boss': {
        const wingBeat = Math.sin(world.time * 9) * 14;
        const staggered = enemy.aiState === 'STAGGERED';
        const bodyCol = flash
          ? '#ffffff'
          : staggered
            ? '#eab308'
            : telegraphing
              ? '#fb7185'
              : '#334155';

        // Massive Mechanical Dragon Wings
        ctx.fillStyle = staggered ? '#ca8a04' : '#1e293b';
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(c.x, c.y - 6);
        ctx.lineTo(c.x - enemy.facing * 52, c.y - 42 + wingBeat);
        ctx.lineTo(c.x - enemy.facing * 26, c.y + 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Armored Chassis
        ctx.fillStyle = bodyCol;
        ctx.fillRect(enemy.x + 6, enemy.y + 14, enemy.w - 12, enemy.h - 14);
        // Dragon Head & Horns
        const headX = enemy.facing === 1 ? enemy.x + enemy.w - 16 : enemy.x - 8;
        ctx.fillRect(headX, enemy.y + 4, 24, 24);
        ctx.fillStyle = telegraphing ? '#fef08a' : '#f43f5e';
        ctx.fillRect(headX + (enemy.facing === 1 ? 14 : 4), enemy.y + 11, 7, 5);

        if (telegraphing) {
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 3;
          ctx.strokeRect(enemy.x - 4, enemy.y - 4, enemy.w + 8, enemy.h + 8);
        }
        break;
      }
    }

    drawHpBar(ctx, enemy);
    ctx.restore();
  }
}
