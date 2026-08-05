import { createTestURL } from '../support/delayedFileServerConfig';

describe('Test delayed server', () => {
  it('delays a response by the requested delayMs before the audio element can play', () => {
    const url = createTestURL('sinwave@440hz.wav', { delayMs: 200 });

    let requestedAt = 0;
    cy.then(() => {
      requestedAt = performance.now();
      const audio = document.createElement('audio');
      audio.src = url;
      document.body.append(audio);
      audio.play().catch(() => {
        /* do nothing */
      });
    });

    cy.get('audio')
      .invoke('prop', 'currentTime')
      .should(($time) => expect(parseFloat($time)).to.be.greaterThan(0))
      .then(() => {
        expect(performance.now() - requestedAt).to.be.at.least(200);
      });
  });
});
