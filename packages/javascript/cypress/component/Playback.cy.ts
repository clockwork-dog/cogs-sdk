import { MediaManager } from '../../src/MediaManager';

describe('Playback tests', () => {
  it('can buffer without playing', () => {
    const manager = new MediaManager([
      {
        id: '1',
        url: 'cypress/fixtures/out.mp4',
        startTime: Date.now() + 60_000,
        endTime: Date.now() + 70_000,
        loop: false,
        volume: 0,
      },
    ]);
    cy.mount(manager.element);

    // Video element is meant to start in 1 minute
    cy.get('video').should('have.prop', 'paused', true);
    cy.get('video').should('have.prop', 'currentTime', 0);
  });

  it('recovers from a pause', () => {
    const manager = new MediaManager([
      {
        id: '1',
        url: 'cypress/fixtures/out.mp4',
        startTime: Date.now(),
        endTime: Date.now() + 1000,
        loop: true,
        volume: 0,
      },
    ]);
    cy.mount(manager.element);

    cy.get('video').should('have.prop', 'paused', false);
    cy.get('video').invoke('trigger', 'pause');
    cy.get('video').should('have.prop', 'paused', true);

    cy.wait(1000);

    cy.get('video').should('have.prop', 'paused', false);
  });

  it('recovers from a seek', () => {
    const manager = new MediaManager([
      {
        id: '1',
        url: 'cypress/fixtures/out.mp4',
        startTime: Date.now(),
        endTime: Date.now() + 100000,
        loop: true,
        volume: 0,
      },
    ]);
    cy.mount(manager.element);

    cy.get('video').invoke('prop', 'currentTime', 10);

    cy.wait(500);

    cy.get('video').invoke('prop', 'currentTime').should('be.lessThan', 5);
  });
});
