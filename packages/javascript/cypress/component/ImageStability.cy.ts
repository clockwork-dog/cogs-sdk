import { SurfaceManager } from '../../src/state-based/SurfaceManager';

const constructAssetURL = (file: string) => `http://localhost:5173/__cypress/iframes/cypress/fixtures/${file}`;
describe('Image stability tests', () => {
  it('can show an image', () => {
    const now = Date.now();
    const manager = new SurfaceManager(constructAssetURL, {
      'clip-id': {
        file: 'indianred@2560x1440.png',
        type: 'image',
        fit: 'cover',
        keyframes: [[now, { set: { opacity: 1 } }]],
      },
    });
    cy.mount(manager);
    cy.get('img').should('exist');
  });

  it("doesn't show a queued image", () => {
    const now = Date.now();
    const manager = new SurfaceManager(constructAssetURL, {
      'clip-id': {
        file: 'indianred@2560x1440.png',
        type: 'image',
        fit: 'cover',
        keyframes: [
          [now + 60_000, { set: { opacity: 1 } }], // show image in 1 minute
        ],
      },
    });
    cy.mount(manager);
    cy.get('img').should('not.exist');
  });

  it('recovers from img element deletion', () => {
    const now = Date.now();
    const manager = new SurfaceManager(constructAssetURL, {
      'clip-id': {
        file: 'indianred@2560x1440.png',
        type: 'image',
        fit: 'cover',
        keyframes: [[now, { set: { opacity: 1 } }]],
      },
    });
    cy.mount(manager);

    cy.get('img').should('exist');
    cy.get('img').invoke('remove');
    cy.get('img').should('not.exist');

    cy.wait(1_000);

    cy.get('img').should('exist');
  });
});
