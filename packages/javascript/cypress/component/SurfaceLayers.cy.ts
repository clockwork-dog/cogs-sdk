import { SurfaceManager } from '../../src/state-based/SurfaceManager';

describe('Surface layer tests', () => {
  it('can take a known screenshot', () => {
    const INDIANRED = { r: 191, g: 99, b: 96 };

    const now = Date.now();
    const manager = new SurfaceManager({
      'clip-id': {
        file: 'cypress/fixtures/indianred@2560x1440.png',
        type: 'image',
        fit: 'cover',
        keyframes: [[now, { set: { opacity: 1 } }]],
      },
    });
    cy.mount(manager);

    cy.assertPixelAt(100, 100, INDIANRED);
  });
});
