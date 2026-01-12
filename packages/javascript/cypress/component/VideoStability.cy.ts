import { SurfaceManager } from '../../src/state-based/SurfaceManager';

describe('Video stability tests', () => {
  it('can wait without playing', () => {
    const now = Date.now();
    const manager = new SurfaceManager({
      'clip-id': {
        file: 'cypress/fixtures/5x2s@2560x1440.mp4',
        type: 'video',
        audioOutput: '',
        fit: 'cover',
        keyframes: [
          [now, { set: { t: 0, rate: 0 } }], // paused at start
          [now + 60_000, { set: { rate: 1 } }], // play in 1 minute
        ],
      },
    });
    cy.mount(manager.element);

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

    cy.log('Interfere with video element');
    cy.get('video').should('have.prop', 'paused', false);
    cy.get('video').invoke('trigger', 'pause');
    cy.get('video').should('have.prop', 'paused', true);

    cy.wait(1000);

    cy.log('Video should have recovered');
    cy.get('video').should('have.prop', 'paused', false);
    cy.get('video').invoke('prop', 'currentTime').should('be.greaterThan', 1.5);
  });

  it('recovers from a play', () => {
    const now = Date.now();
    const manager = new SurfaceManager({
      'clip-id': {
        file: 'cypress/fixtures/5x2s@2560x1440.mp4',
        type: 'video',
        audioOutput: '',
        fit: 'cover',
        keyframes: [[now, { set: { t: 1_500, rate: 0 } }]],
      },
    });
    cy.mount(manager.element);

    // Wait until video ready
    cy.get('video')
      .invoke('prop', 'currentTime')
      .should(($time) => expect(parseFloat($time)).to.be.closeTo(1.5, 0.1));

    cy.log('Interfere with video element');
    cy.get('video').invoke('prop', 'playbackRate', 1);
    cy.get('video').invoke('trigger', 'play');

    cy.wait(1000);

    cy.log('Video should have recovered');
    cy.get('video')
      .invoke('prop', 'currentTime')
      .should(($time) => expect(parseFloat($time)).to.be.closeTo(1.5, 0.1));
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
    cy.get('video').invoke('prop', 'currentTime', 5);

    cy.wait(500);

    cy.log('Video should have recovered');
    cy.get('video').invoke('prop', 'currentTime').should('be.lessThan', 2);
  });
});
