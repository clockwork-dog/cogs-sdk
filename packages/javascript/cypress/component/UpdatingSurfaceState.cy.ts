import { SurfaceManager } from '../../src/state-based/SurfaceManager';

describe('Updating surface state', () => {
  it('adds and removes a video clip', () => {
    const manager = new SurfaceManager({});
    cy.mount(manager.element);

    cy.get('video')
      .should('not.exist')
      .then(() => {
        const now = Date.now();
        manager.state = {
          'clip-id': {
            file: 'cypress/fixtures/2x2s@2560x1440.mp4',
            type: 'video',
            audioOutput: '',
            fit: 'cover',
            keyframes: [
              [now + 100, { set: { t: 0, rate: 1 } }], // play in 100ms
            ],
          },
        };
      })
      .then(() => {
        cy.get('video').should('exist');
      })
      .then(() => {
        manager.state = {};
      })
      .then(() => {
        cy.get('video').should('not.exist');
      });
  });
});
