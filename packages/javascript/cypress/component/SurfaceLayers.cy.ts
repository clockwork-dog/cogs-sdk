import { SurfaceManager } from '../../src/state-based/SurfaceManager';
const INDIAN_RED = { r: 191, g: 99, b: 96 };
const ROYAL_BLUE = { r: 75, g: 104, b: 218 };

describe('Surface layer tests', () => {
  it('can take a known screenshot', () => {
    const now = Date.now();
    const manager = new SurfaceManager({
      red: {
        file: 'cypress/fixtures/indianred@2560x1440.png',
        type: 'image',
        fit: 'cover',
        keyframes: [[now, { set: { opacity: 1 } }]],
      },
    });
    cy.mount(manager);

    // Wait for image to load (naturalWidth is set once loaded)
    cy.get('img')
      .should('be.visible')
      .and(($img) => {
        expect($img[0].naturalWidth).to.be.greaterThan(0);
      });

    cy.assertPixelAt(100, 100, INDIAN_RED);
  });

  it('respects z-index', () => {
    const now = Date.now();
    const manager = new SurfaceManager({
      red: {
        file: 'cypress/fixtures/indianred@2560x1440.png',
        type: 'image',
        fit: 'cover',
        keyframes: [
          [now, { set: { zIndex: 100 } }],
          [now + 2000, { set: { zIndex: 300 } }],
        ],
      },
      blue: {
        file: 'cypress/fixtures/royalblue@2560x1440.png',
        type: 'image',
        fit: 'cover',
        keyframes: [[now, { set: { zIndex: 200 } }]],
      },
    });
    cy.mount(manager);

    // Wait for images to load (naturalWidth is set once loaded)
    cy.get('img')
      .should('be.visible')
      .and(($img) => {
        expect($img[0].naturalWidth).to.be.greaterThan(0);
        expect($img[1].naturalWidth).to.be.greaterThan(0);
      });

    cy.assertPixelAt(100, 100, ROYAL_BLUE);
    cy.wait(2000);
    cy.assertPixelAt(100, 100, INDIAN_RED);
  });
});
