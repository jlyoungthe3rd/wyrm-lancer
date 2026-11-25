import { degToRad, rectCenter } from '../engine/math';
import { computeDivePreviewEnd } from '../game/dragoonAbilities';
import type { Player, WorldState } from '../game/types';

function drawSpear(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  length: number,
  color: string,
  tipGlow = false,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Shaft
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-length * 0.35, 0);
  ctx.lineTo(length * 0.65, 0);
  ctx.stroke();

  // Ornate Azure Crossguard
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(length * 0.52, -5);
  ctx.lineTo(length * 0.6, 0);
  ctx.lineTo(length * 0.52, 5);
  ctx.closePath();
  ctx.fill();

  // Lance Blade
  ctx.fillStyle = tipGlow ? '#e0f2fe' : '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(length * 0.58, -4.5);
  ctx.lineTo(length * 0.92, 0);
  ctx.lineTo(length * 0.58, 4.5);
  ctx.closePath();
  ctx.fill();

  if (tipGlow) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

function drawDragoonBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  facing: 1 | -1,
  state: Player['state'],
  stateTimer: number,
  armorColor: string,
  trimColor: string,
  visorColor: string,
  alpha: number,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  const cx = x + w * 0.5;
  const cy = y + h * 0.5;
  ctx.translate(cx, cy);

  if (state === 'ELUSIVE') {
    ctx.rotate(-facing * stateTimer * 26);
  } else if (state === 'HJ_STARTUP') {
    ctx.scale(1.18, 0.8);
    ctx.translate(0, 5);
  } else if (state === 'HJ_DIVE' || state === 'STARDIVER_DIVE') {
    ctx.rotate(facing * 0.14);
  }

  ctx.scale(facing, 1);

  // Legs
  const runBob = state === 'RUN' ? Math.sin(stateTimer * 22) * 5 : 0;
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-8, 8, 6, 14 + runBob * 0.5);
  ctx.fillRect(2, 8, 6, 14 - runBob * 0.5);
  // Greaves
  ctx.fillStyle = armorColor;
  ctx.fillRect(-9, 13, 7, 9 + runBob * 0.4);
  ctx.fillRect(2, 13, 7, 9 - runBob * 0.4);

  // Armored Torso
  ctx.fillStyle = armorColor;
  ctx.beginPath();
  ctx.moveTo(-10, -8);
  ctx.lineTo(10, -8);
  ctx.lineTo(7, 10);
  ctx.lineTo(-7, 10);
  ctx.closePath();
  ctx.fill();

  // Pauldron spike
  ctx.fillStyle = trimColor;
  ctx.beginPath();
  ctx.moveTo(-12, -8);
  ctx.lineTo(-4, -14);
  ctx.lineTo(-2, -6);
  ctx.closePath();
  ctx.fill();

  // Dragoon Horned Dragon Helm
  ctx.fillStyle = armorColor;
  ctx.beginPath();
  ctx.moveTo(-9, -18);
  ctx.lineTo(10, -17);
  ctx.lineTo(12, -9);
  ctx.lineTo(-8, -9);
  ctx.closePath();
  ctx.fill();

  // Swept-back Dragon Fin Horns
  ctx.fillStyle = trimColor;
  ctx.beginPath();
  ctx.moveTo(-4, -17);
  ctx.lineTo(-16, -27);
  ctx.lineTo(-10, -14);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(2, -17);
  ctx.lineTo(-7, -25);
  ctx.lineTo(-2, -15);
  ctx.closePath();
  ctx.fill();

  // Glowing Visor Slit
  ctx.fillStyle = visorColor;
  ctx.fillRect(2, -14, 7, 3);

  ctx.restore();
}

export function renderDragoon(ctx: CanvasRenderingContext2D, world: WorldState): void {
  const { player, tuning } = world;
  const pc = rectCenter(player);

  // 1. Afterimages
  for (const ghost of player.afterimages) {
    drawDragoonBody(
      ctx,
      ghost.x,
      ghost.y,
      player.w,
      player.h,
      ghost.facing,
      ghost.state,
      0,
      ghost.color,
      ghost.color,
      '#ffffff',
      ghost.alpha * 0.5,
    );
  }

  // 2. Crimson "Life of the Dragon" Aura at 100 Gauge
  if (player.dragonGauge >= tuning.stardiverCost) {
    ctx.save();
    const pulse = 0.55 + Math.sin(world.time * 12) * 0.25;
    const grad = ctx.createRadialGradient(pc.x, pc.y, 4, pc.x, pc.y, 38);
    grad.addColorStop(0, `rgba(244, 63, 94, ${0.42 * pulse})`);
    grad.addColorStop(1, 'rgba(244, 63, 94, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(pc.x, pc.y, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 3. High Jump Apex Aim Cone, Ray & Target Lock-On Reticle
  if (player.state === 'HJ_APEX') {
    const lockTarget = player.hjLockTargetId
      ? world.enemies.find((e) => e.id === player.hjLockTargetId && e.alive) ?? null
      : null;
    const endPoint = computeDivePreviewEnd(pc, player.hjDiveDir, lockTarget, world.tiles);

    ctx.save();
    // Subtle downward cone showing lock-on boundary
    const halfRad = degToRad(tuning.hjLockOnHalfAngleDeg);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.beginPath();
    ctx.moveTo(pc.x, pc.y);
    ctx.arc(pc.x, pc.y, tuning.hjLockOnRange, Math.PI * 0.5 - halfRad, Math.PI * 0.5 + halfRad);
    ctx.closePath();
    ctx.fill();

    // Dashed Trajectory Line
    ctx.strokeStyle = lockTarget ? '#f43f5e' : '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.moveTo(pc.x, pc.y);
    ctx.lineTo(endPoint.x, endPoint.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Reticle
    const rPulse = 1 + Math.sin(world.time * 18) * 0.14;
    ctx.translate(endPoint.x, endPoint.y);
    ctx.rotate(world.time * 3);
    ctx.scale(rPulse, rPulse);
    ctx.strokeStyle = lockTarget ? '#fb7185' : '#7dd3fc';
    ctx.lineWidth = 2.5;
    if (lockTarget) {
      ctx.strokeRect(-14, -14, 28, 28);
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 4. Trailing Crimson Scarf
  if (player.scarfNodes.length >= 2) {
    ctx.save();
    ctx.strokeStyle = player.dragonGauge >= 100 ? '#fb7185' : '#e11d48';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(player.scarfNodes[0].x, player.scarfNodes[0].y);
    for (let i = 1; i < player.scarfNodes.length; i++) {
      ctx.lineTo(player.scarfNodes[i].x, player.scarfNodes[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // 5. Invulnerability Halo & Body
  if (player.invulnTimer > 0 && player.hurtFlashTimer <= 0) {
    ctx.save();
    ctx.strokeStyle =
      player.state === 'STARDIVER_ASCENT' || player.state === 'STARDIVER_DIVE'
        ? 'rgba(244, 63, 94, 0.75)'
        : 'rgba(125, 211, 252, 0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(pc.x, pc.y, 20, 28, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const isStardiver =
    player.state === 'STARDIVER_ASCENT' || player.state === 'STARDIVER_DIVE';
  const armorColor =
    player.hurtFlashTimer > 0
      ? '#fecdd3'
      : isStardiver
        ? '#be123c'
        : '#1d4ed8';
  const trimColor = isStardiver ? '#fda4af' : '#38bdf8';
  const visorColor = isStardiver ? '#fef08a' : '#7dd3fc';

  drawDragoonBody(
    ctx,
    player.x,
    player.y,
    player.w,
    player.h,
    player.facing,
    player.state,
    player.stateTimer,
    armorColor,
    trimColor,
    visorColor,
    1,
  );

  // 6. Spear & Attack Slash/Dive Cones
  if (player.state === 'HJ_DIVE' || player.state === 'STARDIVER_DIVE') {
    const angle = Math.atan2(player.hjDiveDir.y, player.hjDiveDir.x);
    drawSpear(ctx, pc.x, pc.y, angle, 54, isStardiver ? '#f43f5e' : '#38bdf8', true);

    // Energy Cone
    ctx.save();
    ctx.translate(pc.x, pc.y);
    ctx.rotate(angle);
    const coneGrad = ctx.createLinearGradient(0, 0, 44, 0);
    coneGrad.addColorStop(0, isStardiver ? 'rgba(244, 63, 94, 0.1)' : 'rgba(56, 189, 248, 0.1)');
    coneGrad.addColorStop(1, isStardiver ? 'rgba(251, 113, 133, 0.85)' : 'rgba(186, 230, 253, 0.85)');
    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.moveTo(48, 0);
    ctx.lineTo(-14, -18);
    ctx.lineTo(-14, 18);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (player.state === 'HJ_ASCENT' || player.state === 'STARDIVER_ASCENT') {
    drawSpear(ctx, pc.x + player.facing * 4, pc.y - 6, -Math.PI * 0.5, 52, trimColor, true);
  } else if (player.state === 'POGO') {
    drawSpear(ctx, pc.x, pc.y + 8, Math.PI * 0.5, 54, '#38bdf8', true);
    if (
      player.stateTimer >= tuning.thrustStartup &&
      player.stateTimer <= tuning.thrustStartup + tuning.thrustActive
    ) {
      ctx.save();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.beginPath();
      ctx.moveTo(pc.x - 14, player.y + player.h - 2);
      ctx.lineTo(pc.x + 14, player.y + player.h - 2);
      ctx.lineTo(pc.x, player.y + player.h + tuning.pogoReach);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  } else if (player.state === 'THRUST') {
    const kind = player.activeAttackKind ?? 'true_thrust';
    const isActive =
      player.stateTimer >= tuning.thrustStartup &&
      player.stateTimer <= tuning.thrustStartup + tuning.thrustActive;

    if (kind === 'up_thrust') {
      drawSpear(ctx, pc.x, pc.y - 8, -Math.PI * 0.5, 58, '#38bdf8', isActive);
      if (isActive) {
        ctx.save();
        ctx.fillStyle = 'rgba(125, 211, 252, 0.45)';
        ctx.beginPath();
        ctx.moveTo(pc.x - 12, player.y + 4);
        ctx.lineTo(pc.x + 12, player.y + 4);
        ctx.lineTo(pc.x, player.y - tuning.upThrustReach);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    } else {
      const reach = kind === 'vorpal_thrust' ? tuning.vorpalReach : tuning.thrustReach;
      const lungeOffset = isActive ? player.facing * 18 : player.facing * 6;
      const angle = player.facing === 1 ? 0 : Math.PI;
      drawSpear(
        ctx,
        pc.x + lungeOffset,
        pc.y + 1,
        angle,
        kind === 'vorpal_thrust' ? 68 : 54,
        kind === 'vorpal_thrust' ? '#fbbf24' : '#38bdf8',
        isActive,
      );
      if (isActive) {
        ctx.save();
        ctx.fillStyle =
          kind === 'vorpal_thrust'
            ? 'rgba(251, 191, 36, 0.42)'
            : 'rgba(56, 189, 248, 0.38)';
        ctx.beginPath();
        ctx.moveTo(pc.x, pc.y - 10);
        ctx.lineTo(pc.x + player.facing * reach, pc.y + 1);
        ctx.lineTo(pc.x, pc.y + 12);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  } else {
    const restAngle = player.facing === 1 ? -0.32 : Math.PI + 0.32;
    drawSpear(ctx, pc.x + player.facing * 6, pc.y + 2, restAngle, 48, '#38bdf8', false);
  }
}
