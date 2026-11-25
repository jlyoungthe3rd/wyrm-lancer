import type { SwipeDirection } from '../engine/touchInput';

export class CornerFlashOverlay {
  private corners: HTMLElement[];

  constructor(container: HTMLElement) {
    this.corners = Array.from(container.querySelectorAll('.corner-flash'));
  }

  pulse(dir: SwipeDirection): void {
    const toneClass = dir === 'down' ? 'tone-drop' : 'tone-azure';
    for (const el of this.corners) {
      el.classList.remove('active', 'tone-azure', 'tone-drop');
      // Force reflow so rapid consecutive swipes always re-trigger the 190ms pulse cleanly
      void el.offsetWidth;
      el.classList.add(toneClass, 'active');
    }
  }
}
