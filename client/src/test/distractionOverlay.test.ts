import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  armDistractionOverlay,
  closeDistractionOverlay,
  setDistractionOverlayFocusHandler,
  showDistractionOverlay,
} from '../lib/distractionOverlay';

interface FakePipWindow {
  window: Window;
  document: Document;
  closeSpy: ReturnType<typeof vi.fn>;
}

function createFakePipWindow(): FakePipWindow {
  const pipDocument = document.implementation.createHTMLDocument('tempo-pip');
  const closeSpy = vi.fn();
  const windowState = { closed: false };

  const fakeWindow = {
    document: pipDocument,
    get closed() {
      return windowState.closed;
    },
    addEventListener: vi.fn(),
    close: () => {
      closeSpy();
      windowState.closed = true;
    },
  } as unknown as Window;

  return { window: fakeWindow, document: pipDocument, closeSpy };
}

describe('distractionOverlay open behavior', () => {
  let requestWindowMock: any;
  let fakePip: FakePipWindow;

  beforeEach(() => {
    vi.spyOn(window, 'focus').mockImplementation(() => {});
    fakePip = createFakePipWindow();
    requestWindowMock = vi.fn(async () => fakePip.window);
    Object.defineProperty(window, 'documentPictureInPicture', {
      configurable: true,
      value: { requestWindow: requestWindowMock },
    });
    window.history.pushState({}, '', '/dashboard');
  });

  afterEach(() => {
    setDistractionOverlayFocusHandler(null);
    closeDistractionOverlay();
    window.history.pushState({}, '', '/');
    vi.restoreAllMocks();
  });

  it('calls configured focus handler when Open Tempo is clicked', async () => {
    const focusHandler = vi.fn();
    setDistractionOverlayFocusHandler(focusHandler);

    await armDistractionOverlay();
    await showDistractionOverlay({ tabSwitchCount: 5 });

    const openButton = Array.from(fakePip.document.querySelectorAll('button'))
      .find((button) => button.textContent === 'Open Tempo');
    expect(openButton).toBeTruthy();
    openButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(focusHandler).toHaveBeenCalledTimes(1);
    expect(fakePip.closeSpy).not.toHaveBeenCalled();
  });

  it('navigates via history without forcing reload when no focus handler exists', async () => {
    setDistractionOverlayFocusHandler(null);

    await armDistractionOverlay();
    await showDistractionOverlay({ tabSwitchCount: 3 });

    const openButton = Array.from(fakePip.document.querySelectorAll('button'))
      .find((button) => button.textContent === 'Open Tempo');
    expect(openButton).toBeTruthy();
    openButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(window.location.pathname).toBe('/');
    expect(fakePip.closeSpy).not.toHaveBeenCalled();
  });
});
