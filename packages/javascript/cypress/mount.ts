import { getContainerEl, setupHooks } from '@cypress/mount-utils';

export function mount(element: HTMLElement): Cypress.Chainable {
  const container = getContainerEl();

  // 100% styling
  document.body.style.margin = '0';
  container.style.width = '100vw';
  container.style.height = '100vh';

  // clean up each time we mount a new component
  container.innerHTML = '';
  // mount component
  container.append(element);
  // initialize internal pre/post test hooks
  setupHooks();

  return cy.wrap(element, { log: false });
}
