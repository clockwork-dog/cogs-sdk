import { SurfaceManager } from '../../src/state-based/SurfaceManager';

const INITIAL_VOLUME = 0;
const CHANGED_VOLUME = 1;

describe('Volume tests', () => {
  it('resets volume', () => {
    const now = Date.now();
    const manager = new SurfaceManager({
      'clip-id': {
        type: 'video',
        file: 'cypress/fixtures/2x2s@2560x1440.mp4',
        audioOutput: '',
        fit: 'cover',
        keyframes: [
          [now, { set: { t: 0, rate: 1, volume: INITIAL_VOLUME } }],
          [now + 2_000, { set: { t: 0, rate: 1 } }],
          [now + 2_000, { set: { t: 0, rate: 1 } }],
          [now + 4_000, { set: { t: 0, rate: 1 } }],
          [now + 6_000, { set: { t: 0, rate: 1 } }],
          [now + 8_000, { set: { t: 0, rate: 1 } }],
          [now + 10_000, { set: { t: 0, rate: 1 } }],
        ],
      },
    });
    cy.mount(manager.element);

    cy.get('video').invoke('prop', 'volume', CHANGED_VOLUME);
    cy.get('video').should('have.prop', 'volume', CHANGED_VOLUME);

    cy.wait(1000);

    cy.get('video').should('have.prop', 'volume', INITIAL_VOLUME);
  });
});
