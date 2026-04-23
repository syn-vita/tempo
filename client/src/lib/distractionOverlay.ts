interface DocumentPictureInPictureApi {
  requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
}

interface DistractionOverlayPayload {
  tabSwitchCount: number;
}

const OVERLAY_WIDTH = 360;
const OVERLAY_HEIGHT = 220;
const STYLE_ID = 'tempo-distraction-overlay-style';
const ROOT_ID = 'tempo-distraction-overlay-root';

let pipWindow: Window | null = null;

function getDocumentPictureInPictureApi(): DocumentPictureInPictureApi | null {
  if (typeof window === 'undefined') return null;
  const maybeApi = (window as Window & { documentPictureInPicture?: DocumentPictureInPictureApi })
    .documentPictureInPicture;
  return maybeApi ?? null;
}

function installStyles(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) return;

  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    :root {
      color-scheme: light dark;
      font-family: "Inter", "Segoe UI", sans-serif;
    }
    body {
      margin: 0;
      min-height: 100vh;
      background: radial-gradient(120% 120% at 20% 10%, #14203b 0%, #081225 60%, #050a16 100%);
      color: #f8fafc;
    }
    #${ROOT_ID} {
      box-sizing: border-box;
      width: 100%;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 14px;
    }
    .tempo-card {
      width: 100%;
      border-radius: 16px;
      padding: 14px;
      border: 1px solid rgba(148, 163, 184, 0.24);
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.7));
      box-shadow: 0 12px 36px rgba(2, 6, 23, 0.4);
    }
    .tempo-title {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.01em;
    }
    .tempo-copy {
      margin: 6px 0 0;
      font-size: 12px;
      line-height: 1.45;
      color: rgba(226, 232, 240, 0.9);
    }
    .tempo-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }
    .tempo-btn {
      flex: 1;
      border-radius: 10px;
      border: 1px solid rgba(148, 163, 184, 0.28);
      background: rgba(15, 23, 42, 0.4);
      color: #f8fafc;
      font-size: 12px;
      font-weight: 600;
      padding: 8px 10px;
      cursor: pointer;
    }
    .tempo-btn-primary {
      border-color: rgba(37, 99, 235, 0.56);
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.95), rgba(37, 99, 235, 0.95));
    }
  `;

  doc.head.appendChild(style);
}

function renderOverlay(doc: Document, payload: DistractionOverlayPayload): void {
  let root = doc.getElementById(ROOT_ID);
  if (!root) {
    root = doc.createElement('div');
    root.id = ROOT_ID;
    doc.body.replaceChildren(root);
  }

  root.replaceChildren();

  const card = doc.createElement('section');
  card.className = 'tempo-card';

  const title = doc.createElement('h1');
  title.className = 'tempo-title';
  title.textContent = 'Tempo: Focus check';

  const copy = doc.createElement('p');
  copy.className = 'tempo-copy';
  copy.textContent = `We detected ${payload.tabSwitchCount} tab switches recently. Open Tempo to decide whether to take a break.`;

  const actions = doc.createElement('div');
  actions.className = 'tempo-actions';

  const openButton = doc.createElement('button');
  openButton.className = 'tempo-btn tempo-btn-primary';
  openButton.type = 'button';
  openButton.textContent = 'Open Tempo';
  openButton.addEventListener('click', () => {
    window.focus();
    window.location.assign('/');
    closeDistractionOverlay();
  });

  const dismissButton = doc.createElement('button');
  dismissButton.className = 'tempo-btn';
  dismissButton.type = 'button';
  dismissButton.textContent = 'Dismiss';
  dismissButton.addEventListener('click', () => {
    closeDistractionOverlay();
  });

  actions.append(openButton, dismissButton);
  card.append(title, copy, actions);
  root.appendChild(card);
}

async function ensureOverlayWindow(): Promise<Window | null> {
  if (pipWindow && !pipWindow.closed) return pipWindow;

  const api = getDocumentPictureInPictureApi();
  if (!api) return null;

  const nextWindow = await api.requestWindow({ width: OVERLAY_WIDTH, height: OVERLAY_HEIGHT });
  pipWindow = nextWindow;
  pipWindow.addEventListener('pagehide', () => {
    pipWindow = null;
  });
  return pipWindow;
}

export function supportsDistractionOverlay(): boolean {
  return getDocumentPictureInPictureApi() !== null;
}

export async function showDistractionOverlay(payload: DistractionOverlayPayload): Promise<boolean> {
  try {
    const targetWindow = await ensureOverlayWindow();
    if (!targetWindow) return false;
    installStyles(targetWindow.document);
    renderOverlay(targetWindow.document, payload);
    return true;
  } catch {
    return false;
  }
}

export function closeDistractionOverlay(): void {
  if (!pipWindow || pipWindow.closed) {
    pipWindow = null;
    return;
  }
  pipWindow.close();
  pipWindow = null;
}
