const LOOP_DURATION = 2_000;
const FPS = 60;
const TOTAL_LOOPS = 2;
const TOTAL_FRAMES = Math.floor(LOOP_DURATION * (FPS / 1000) * TOTAL_LOOPS);

describe('template spec', () => {
  it('testing', { baseUrl: null }, () => {
    const frameDuration = 1000 / FPS;
    let frame = 0;
    let ms = 0;

    while (frame < TOTAL_FRAMES) {
      cy.task('log', `[frame: ${frame + 1}/${TOTAL_FRAMES}] [ms: ${ms.toFixed(2)}/${TOTAL_LOOPS * LOOP_DURATION}]`);
      cy.visit(`cypress/e2e/test-video.html?loopDurationMs=${LOOP_DURATION}&currentMs=${ms}`);
      cy.screenshot(`${frame}`, { capture: 'viewport', overwrite: true });
      // Set up for next iteration
      frame++;
      ms = frame * frameDuration;
    }
  });
});
