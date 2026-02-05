import { SurfaceManager } from '../../src/state-based/SurfaceManager';

const constructAssetURL = (file: string) => `cypress/fixtures/${file}`;
describe('Audio stability tests', () => {
  it('can wait without playing', () => {
    const now = Date.now();
    const manager = new SurfaceManager(constructAssetURL, {
      'clip-id': {
        file: 'sinwave@440hz.wav',
        type: 'audio',
        audioOutput: '',
        keyframes: [
          [now, { set: { t: 0, rate: 0 } }], // paused at start
          [now + 60_000, { set: { rate: 1 } }], // play in 1 minute
        ],
      },
    });
    cy.mount(manager);

    cy.get('audio').should('have.prop', 'paused', true);
    cy.get('audio').should('have.prop', 'currentTime', 0);
  });

  it('recovers from a pause', () => {
    const now = Date.now();
    const manager = new SurfaceManager(constructAssetURL, {
      'clip-id': {
        file: 'metronome@120bpm.wav',
        type: 'audio',
        audioOutput: '',
        keyframes: [[now, { set: { t: 0, rate: 1 } }]],
      },
    });
    cy.mount(manager);

    cy.log('Interfere with audio element');
    cy.get('audio').should('have.prop', 'paused', false);
    cy.get('audio').invoke('trigger', 'pause');
    cy.get('audio').should('have.prop', 'paused', true);

    cy.wait(1000);

    cy.log('audio should have recovered');
    cy.get('audio').should('have.prop', 'paused', false);
    cy.get('audio').invoke('prop', 'currentTime').should('be.greaterThan', 1.5);
  });

  it('recovers from a play', () => {
    const now = Date.now();
    const manager = new SurfaceManager(constructAssetURL, {
      'clip-id': {
        file: 'metronome@120bpm.wav',
        type: 'audio',
        audioOutput: '',
        keyframes: [[now, { set: { t: 1_500, rate: 0 } }]],
      },
    });
    cy.mount(manager);

    // Wait until audio ready
    cy.get('audio')
      .invoke('prop', 'currentTime')
      .should(($time) => expect(parseFloat($time)).to.be.closeTo(1.5, 0.1));

    cy.log('Interfere with audio element');
    cy.get('audio').invoke('prop', 'paused').should('be.true');
    cy.get('audio').invoke('prop', 'playbackRate', 1);
    cy.get('audio').then(($audio) => $audio.get(0).play().catch(/* do nothing*/));
    cy.get('audio').invoke('prop', 'paused').should('be.false');

    cy.wait(1000);

    cy.log('audio should have recovered');
    cy.get('audio')
      .invoke('prop', 'currentTime')
      .should(($time) => expect(parseFloat($time)).to.be.closeTo(1.5, 0.1));
  });

  it('recovers from a seek', () => {
    const now = Date.now();
    const manager = new SurfaceManager(constructAssetURL, {
      'clip-id': {
        file: 'metronome@120bpm.wav',
        type: 'audio',
        audioOutput: '',
        keyframes: [[now, { set: { t: 0, rate: 1 } }]],
      },
    });
    cy.mount(manager);

    cy.log('Interfere with audio element');
    cy.get('audio').invoke('prop', 'currentTime', 5);

    cy.wait(500);

    cy.log('audio should have recovered');
    cy.get('audio').invoke('prop', 'currentTime').should('be.lessThan', 2);
  });

  it('recovers from volume change', () => {
    const INITIAL_VOLUME = 0;
    const CHANGED_VOLUME = 1;
    const now = Date.now();
    const manager = new SurfaceManager(constructAssetURL, {
      'clip-id': {
        type: 'audio',
        file: 'sinwave@440hz.wav',
        audioOutput: '',
        keyframes: [[now, { set: { t: 0, rate: 1, volume: INITIAL_VOLUME } }]],
      },
    });
    cy.mount(manager);

    cy.get('audio').invoke('prop', 'volume', CHANGED_VOLUME);
    cy.get('audio').should('have.prop', 'volume', CHANGED_VOLUME);

    cy.wait(1000);

    cy.get('audio').should('have.prop', 'volume', INITIAL_VOLUME);
  });

  it('recovers from audio element deletion', () => {
    const now = Date.now();
    const manager = new SurfaceManager(constructAssetURL, {
      'clip-id': {
        type: 'audio',
        file: 'sinwave@440hz.wav',
        audioOutput: '',
        keyframes: [[now, { set: { t: 0, rate: 1 } }]],
      },
    });
    cy.mount(manager);

    cy.get('audio').should('exist');
    cy.get('audio').invoke('remove');
    cy.get('audio').should('not.exist');

    cy.wait(1000);

    cy.get('audio').should('exist');
  });

  it('smoothly returns to correct time using playbackRate', () => {
    const now = Date.now();
    const manager = new SurfaceManager(constructAssetURL, {
      'clip-id': {
        type: 'audio',
        file: 'metronome@120bpm.wav',
        audioOutput: '',
        keyframes: [[now - 500, { set: { t: 0, rate: 1 } }]],
      },
    });
    cy.mount(manager);

    cy.get('audio').invoke('prop', 'currentTime').should('be.lessThan', 2);
  });
});
