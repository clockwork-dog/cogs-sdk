import { getContainerEl, setupHooks } from '@cypress/mount-utils';

export function mount(element: HTMLElement): Cypress.Chainable {
  const container = getContainerEl();

  // clean up each time we mount a new component
  container.innerHTML = '';
  // mount component
  container.append(element);
  // initialize internal pre/post test hooks
  setupHooks();

  return cy.wrap(element, { log: false });
}
