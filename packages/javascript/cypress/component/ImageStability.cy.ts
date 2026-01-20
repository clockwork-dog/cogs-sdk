import { SurfaceManager } from '../../src/state-based/SurfaceManager';

describe('Image stability tests', () => {
  it('can show an image', () => {
    const now = Date.now();
    const manager = new SurfaceManager({
      'clip-id': {
        file: 'cypress/fixtures/indianred@2560x1440.png',
        type: 'image',
        fit: 'cover',
        keyframes: [[now, { set: { opacity: 1 } }]],
      },
    });
    cy.mount(manager.element);
    cy.get('img').should('exist');
  });

  it("doesn't show a queued image", () => {
    const now = Date.now();
    const manager = new SurfaceManager({
      'clip-id': {
        file: 'cypress/fixtures/indianred@2560x1440.png',
        type: 'image',
        fit: 'cover',
        keyframes: [
          [now + 60_000, { set: { opacity: 1 } }], // show image in 1 minute
        ],
      },
    });
    cy.mount(manager.element);
    cy.get('img').should('not.exist');
  });

  it('recovers from img element src change', () => {
    const ORIGINAL_SRC = 'cypress/fixtures/indianred@2560x1440.png';
    const CHANGED_SRC = '404.png';
    const now = Date.now();
    const manager = new SurfaceManager({
      'clip-id': {
        file: ORIGINAL_SRC,
        type: 'image',
        fit: 'cover',
        keyframes: [[now, { set: { opacity: 1 } }]],
      },
    });
    cy.mount(manager.element);

    cy.get('img').should('exist');
    cy.get('img').invoke('prop', 'src', CHANGED_SRC);

    cy.wait(1_000);

    cy.get('img')
      .invoke('prop', 'src')
      .should(($src) => expect($src).to.contain(ORIGINAL_SRC));
  });

  it('recovers from img element deletion', () => {
    const now = Date.now();
    const manager = new SurfaceManager({
      'clip-id': {
        file: 'cypress/fixtures/indianred@2560x1440.png',
        type: 'image',
        fit: 'cover',
        keyframes: [[now, { set: { opacity: 1 } }]],
      },
    });
    cy.mount(manager.element);

    cy.get('img').should('exist');
    cy.get('img').invoke('remove');
    cy.get('img').should('not.exist');

    cy.wait(1_000);

    cy.get('img').should('exist');
  });
});
