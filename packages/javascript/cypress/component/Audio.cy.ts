import { MediaManager } from '../../src/MediaManager';

describe('Audio sync tests', () => {
  it('sounds okay', () => {
    const manager1 = new MediaManager([
      {
        id: '1',
        url: 'cypress/fixtures/test.mp3',
        startTime: Date.now(),
        endTime: Date.now() + 60_000,
        loop: false,
        volume: 1,
      },
    ]);
    const manager2 = new MediaManager([
      {
        id: '1',
        url: 'cypress/fixtures/test.mp3',
        startTime: Date.now(),
        endTime: Date.now() + 60_000,
        loop: false,
        volume: 1,
      },
    ]);
    const parent = document.createElement('div');
    parent.appendChild(manager1.element);
    parent.appendChild(manager2.element);
    cy.mount(parent);
  });
});
