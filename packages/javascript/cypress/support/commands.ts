/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

import { z } from 'zod';
type Color = z.infer<typeof rgb>;
const rgb = z.object({
  r: z.int().gte(0).lte(255),
  g: z.int().gte(0).lte(255),
  b: z.int().gte(0).lte(255),
});

Cypress.Commands.add('getPixelAt', (x: number, y: number) => {
  const id = '123';
  cy.screenshot(id, { overwrite: true, capture: 'viewport' });
  cy.task('get-pixel-value', { id, x, y }).then(($response) => {
    try {
      return rgb.parse($response);
    } catch (e) {
      console.error($response);
      console.error(e);
    }
  });
});

// If all r,g,b are within ε of the expected value the color is expected
// An identical web page will be rendered differently depending on the color profile.
// This will be different on different machines, and displays
const RGB_ε = 15;
Cypress.Commands.add('assertPixelAt', (x: number, y: number, color: Color) => {
  cy.getPixelAt(x, y).then(($response) => {
    expect($response.r).to.be.closeTo(color.r, RGB_ε);
    expect($response.g).to.be.closeTo(color.g, RGB_ε);
    expect($response.b).to.be.closeTo(color.b, RGB_ε);
  });
});

declare global {
  //   eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      getPixelAt(x: number, y: number): Chainable<Color>;
      assertPixelAt(x: number, y: number, color: Color): Chainable<void>;
    }
  }
}

// Required to declare global
export {};
