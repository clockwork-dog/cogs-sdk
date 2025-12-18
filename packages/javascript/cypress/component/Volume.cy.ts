import { MediaManager } from '../../src/MediaManager';

const INITIAL_VOLUME = 0;
const CHANGED_VOLUME = 1;

describe('Volume tests', () => {
  it('resets volume', () => {
    const manager = new MediaManager([
      {
        id: '1',
        url: 'cypress/fixtures/out.mp4',
        startTime: Date.now(),
        endTime: Date.now() + 1000,
        loop: true,
        volume: INITIAL_VOLUME,
      },
    ]);
    cy.mount(manager.element);

    cy.get('video').invoke('prop', 'volume', CHANGED_VOLUME);
    cy.get('video').should('have.prop', 'volume', CHANGED_VOLUME);

    cy.wait(1000);

    cy.get('video').should('have.prop', 'volume', INITIAL_VOLUME);
  });
});
