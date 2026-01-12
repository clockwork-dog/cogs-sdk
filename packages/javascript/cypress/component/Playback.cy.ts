import { SurfaceManager } from '../../src/state-based/SurfaceManager';

describe('Playback tests', () => {
  it('can buffer without playing', () => {
    const now = Date.now();
    const manager = new SurfaceManager({
      'clip-id': {
        file: 'cypress/fixtures/5x2s@2560x1440.mp4',
        type: 'video',
        audioOutput: '',
        fit: 'cover',
        keyframes: [
          [now, { set: { t: 0, rate: 0 } }], // paused at start
          [now + 2_000, { set: { t: 0, rate: 0 } }], // play in 2 seconds
        ],
      },
    });
    cy.mount(manager.element);

    // Video element is meant to start in 1 minute
    cy.get('video').should('have.prop', 'paused', true);
    cy.get('video').should('have.prop', 'currentTime', 0);
  });

  it('recovers from a pause', () => {
    const now = Date.now();
    const manager = new SurfaceManager({
      'clip-id': {
        file: 'cypress/fixtures/5x2s@2560x1440.mp4',
        type: 'video',
        audioOutput: '',
        fit: 'cover',
        keyframes: [[now, { set: { t: 0, rate: 1 } }]],
      },
    });
    cy.mount(manager.element);

    // Allow video to start playing.
    // Calling pause() during async play() will throw an error

    cy.log('Interfere with video element');
    cy.get('video').should('have.prop', 'paused', false);
    cy.get('video').invoke('trigger', 'pause');
    cy.get('video').should('have.prop', 'paused', true);

    cy.wait(1000);

    cy.log('Video should have recovered');
    cy.get('video').should('have.prop', 'paused', false);
    cy.get('video').invoke('prop', 'currentTime').should('be.greaterThan', 1.5);
  });

  it('recovers from a seek', () => {
    const now = Date.now();
    const manager = new SurfaceManager({
      'clip-id': {
        file: 'cypress/fixtures/5x2s@2560x1440.mp4',
        type: 'video',
        audioOutput: '',
        fit: 'cover',
        keyframes: [[now, { set: { t: 0, rate: 1 } }]],
      },
    });
    cy.mount(manager.element);

    cy.log('Interfere with video element');
    cy.get('video').invoke('prop', 'currentTime', 10);

    cy.wait(500);

    cy.log('Video should have recovered');
    cy.get('video').invoke('prop', 'currentTime').should('be.lessThan', 5);
  });
});
