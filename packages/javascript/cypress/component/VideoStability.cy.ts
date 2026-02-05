import { SurfaceManager } from '../../src/state-based/SurfaceManager';

const constructAssetURL = (file: string) => `cypress/fixtures/${file}`;
describe('Video stability tests', () => {
  it('can wait without playing', () => {
    const now = Date.now();
    const manager = new SurfaceManager(constructAssetURL, {
      'clip-id': {
        file: 'yuv444p~5x2s@2560x1440.mp4',
        type: 'video',
        audioOutput: '',
        fit: 'cover',
        keyframes: [
          [now, { set: { t: 0, rate: 0 } }], // paused at start
          [now + 60_000, { set: { rate: 1 } }], // play in 1 minute
        ],
      },
    });
    cy.mount(manager);

    cy.get('video').should('have.prop', 'paused', true);
    cy.get('video').should('have.prop', 'currentTime', 0);
  });

  it('recovers from a pause', () => {
    const now = Date.now();
    const manager = new SurfaceManager(constructAssetURL, {
      'clip-id': {
        file: 'yuv444p~5x2s@2560x1440.mp4',
        type: 'video',
        audioOutput: '',
        fit: 'cover',
        keyframes: [[now, { set: { t: 0, rate: 1 } }]],
      },
    });
    cy.mount(manager);

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
    const manager = new SurfaceManager(constructAssetURL, {
      'clip-id': {
        file: 'yuv444p~5x2s@2560x1440.mp4',
        type: 'video',
        audioOutput: '',
        fit: 'cover',
        keyframes: [[now, { set: { t: 1_500, rate: 0 } }]],
      },
    });
    cy.mount(manager);

    // Wait until video ready
    cy.get('video')
      .invoke('prop', 'currentTime')
      .should(($time) => expect(parseFloat($time)).to.be.closeTo(1.5, 0.1));

    cy.log('Interfere with video element');
    cy.get('video').invoke('prop', 'paused').should('be.true');
    cy.get('video').invoke('prop', 'playbackRate', 1);
    cy.get('video').then(($video) => $video.get(0).play().catch(/* do nothing*/));
    cy.get('video').invoke('prop', 'paused').should('be.false');

    cy.wait(1000);

    cy.log('Video should have recovered');
    cy.get('video')
      .invoke('prop', 'currentTime')
      .should(($time) => expect(parseFloat($time)).to.be.closeTo(1.5, 0.1));
  });

  it('recovers from a seek', () => {
    const now = Date.now();
    const manager = new SurfaceManager(constructAssetURL, {
      'clip-id': {
        file: 'yuv444p~5x2s@2560x1440.mp4',
        type: 'video',
        audioOutput: '',
        fit: 'cover',
        keyframes: [[now, { set: { t: 0, rate: 1 } }]],
      },
    });
    cy.mount(manager);

    cy.log('Interfere with video element');
    cy.get('video').invoke('prop', 'currentTime', 5);

    cy.wait(500);

    cy.log('Video should have recovered');
    cy.get('video').invoke('prop', 'currentTime').should('be.lessThan', 2);
  });

  it('recovers from volume change', () => {
    const INITIAL_VOLUME = 0;
    const CHANGED_VOLUME = 1;
    const now = Date.now();
    const manager = new SurfaceManager(constructAssetURL, {
      'clip-id': {
        type: 'video',
        file: 'yuv444p~5x2s@2560x1440.mp4',
        audioOutput: '',
        fit: 'cover',
        keyframes: [[now, { set: { t: 0, rate: 1, volume: INITIAL_VOLUME } }]],
      },
    });
    cy.mount(manager);

    cy.get('video').invoke('prop', 'volume', CHANGED_VOLUME);
    cy.get('video').should('have.prop', 'volume', CHANGED_VOLUME);

    cy.wait(1000);

    cy.get('video').should('have.prop', 'volume', INITIAL_VOLUME);
  });

  it('recovers from video element deletion', () => {
    const now = Date.now();
    const manager = new SurfaceManager(constructAssetURL, {
      'clip-id': {
        type: 'video',
        file: 'yuv444p~5x2s@2560x1440.mp4',
        audioOutput: '',
        fit: 'cover',
        keyframes: [[now, { set: { t: 0, rate: 1 } }]],
      },
    });
    cy.mount(manager);

    cy.get('video').should('exist');
    cy.get('video').invoke('remove');
    cy.get('video').should('not.exist');

    cy.wait(1000);

    cy.get('video').should('exist');
  });

  it('smoothly returns to correct time using playbackRate', () => {
    const now = Date.now();
    const manager = new SurfaceManager(constructAssetURL, {
      'clip-id': {
        type: 'video',
        file: 'yuv444p~5x2s@2560x1440.mp4',
        audioOutput: '',
        fit: 'cover',
        keyframes: [[now - 500, { set: { t: 0, rate: 1 } }]],
      },
    });
    cy.mount(manager);

    cy.get('video').invoke('prop', 'currentTime').should('be.lessThan', 2);
  });
});
