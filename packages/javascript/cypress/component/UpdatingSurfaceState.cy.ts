import { DATA_CLIP_ID, SurfaceManager } from '../../src/state-based/SurfaceManager';

describe('Updating surface state', () => {
  it('adds and removes a video clip', () => {
    const manager = new SurfaceManager({});
    cy.mount(manager);

    cy.get('video')
      .should('not.exist')
      .then(() => {
        const now = Date.now();
        manager.setState({
          'clip-id': {
            file: 'cypress/fixtures/2x2s@2560x1440.mp4',
            type: 'video',
            audioOutput: '',
            fit: 'cover',
            keyframes: [
              [now + 1_000, { set: { t: 0, rate: 1 } }], // play in 1s
            ],
          },
        });
      })
      .then(() => {
        // This implicitly waits
        cy.get('video').should('exist');
      })
      .then(() => {
        manager.setState({});
      })
      .then(() => {
        cy.get('video').should('not.exist');
      });
  });

  it('adds multiple media', () => {
    const now = Date.now();
    const manager = new SurfaceManager({});
    cy.mount(manager);
    expect(manager.element.children.length).to.eq(0);

    manager.setState({
      'image-background': {
        type: 'image',
        file: 'cypress/fixtures/indianred@2560x1440.png',
        fit: 'cover',
        keyframes: [[now, {}]],
      },
      'video-foreground': {
        type: 'video',
        fit: 'contain',
        audioOutput: '',
        file: 'cypress/fixtures/yuv444p~5x2s@2560x1440.mp4',
        keyframes: [[now, {}]],
      },
    });

    cy.get(`[${DATA_CLIP_ID}=image-background]`).should('exist');
    cy.get(`[${DATA_CLIP_ID}=video-foreground]`).should('exist');
  });
});
