import { getContainerEl, setupHooks } from '@cypress/mount-utils';
import { SurfaceManager } from '../src/state-based/SurfaceManager';

export function mount(surfaceManager: SurfaceManager): Cypress.Chainable {
  const container = getContainerEl();

  // 100% styling
  document.body.style.margin = '0';
  container.style.width = '100vw';
  container.style.height = '100vh';

  // clean up each time we mount a new component
  container.innerHTML = '';
  const prevManager = (window as any).surfaceManager as SurfaceManager;
  prevManager?.setState({});

  // mount component
  (window as any).surfaceManager = surfaceManager;
  container.append(surfaceManager.element);

  // initialize internal pre/post test hooks
  setupHooks();

  return cy.wrap(surfaceManager.element, { log: false });
}
