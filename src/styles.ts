export const WIDGET_CSS = `
.vir-widget {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  line-height: 1.5;
  color: #1A1916;
  position: relative;
  z-index: 10;
}

.vir-widget *, .vir-widget *::before, .vir-widget *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* ── Variables ── */
.vir-widget {
  --vir-accent: #2563EB;
  --vir-accent-text: #ffffff;
  --vir-bg: #F7F6F2;
  --vir-surface: #FFFFFF;
  --vir-border: #E5E3DC;
  --vir-border-strong: #C8C5BC;
  --vir-text: #1A1916;
  --vir-text-muted: #6B6860;
  --vir-text-subtle: #9B9890;
  --vir-blue: #2563EB;
  --vir-blue-light: #EFF6FF;
  --vir-green: #059669;
  --vir-green-light: #ECFDF5;
  --vir-amber: #D97706;
  --vir-purple: #7C3AED;
  --vir-r-sm: 6px;
  --vir-r: 10px;
  --vir-r-lg: 16px;
  --vir-shadow-sm: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
  --vir-shadow: 0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
  --vir-shadow-lg: 0 20px 60px rgba(0,0,0,0.16), 0 8px 20px rgba(0,0,0,0.08);
}

/* ── CTA Banner ── */
.vir-widget .vir-cta {
  background: var(--vir-surface);
  border: 1.5px solid var(--vir-border-strong);
  border-radius: var(--vir-r-lg);
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 24px;
}

.vir-widget .vir-cta__icon { font-size: 22px; color: var(--vir-accent); flex-shrink: 0; }

.vir-widget .vir-cta__btn {
  padding: 8px 16px;
  background: var(--vir-accent);
  color: var(--vir-accent-text);
  border: none; border-radius: var(--vir-r);
  font-size: 13px; font-weight: 600; cursor: pointer;
  white-space: nowrap; font-family: inherit;
  transition: opacity 0.15s;
}
.vir-widget .vir-cta__btn:hover { opacity: 0.88; }

.vir-widget .vir-cta__text { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.vir-widget .vir-cta__text strong { font-size: 14px; font-weight: 700; }
.vir-widget .vir-cta__text span { font-size: 12px; color: var(--vir-text-muted); }

/* ── In-room banner ── */
.vir-widget .in-room-banner {
  background: #1A1916;
  color: #fff;
}

.vir-widget .in-room-banner__inner {
  padding: 10px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.vir-widget .in-room-banner__left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }

.vir-widget .in-room-banner__room-swatch {
  width: 36px; height: 28px; border-radius: 4px; border: 2px solid;
  flex-shrink: 0; overflow: hidden; display: flex; flex-direction: column;
}

.vir-widget .in-room-banner__room-floor { height: 35%; margin-top: auto; }

.vir-widget .in-room-banner__top-line {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; opacity: 0.7; margin-bottom: 2px; flex-wrap: wrap;
}

.vir-widget .in-room-banner__label {
  font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #A8E6C0;
}

.vir-widget .in-room-banner__dot { opacity: 0.4; }

.vir-widget .in-room-banner__scope-note { font-size: 10px; opacity: 0.55; font-style: italic; }

.vir-widget .in-room-banner__bottom-line {
  display: flex; align-items: center; gap: 6px; font-size: 13px; flex-wrap: wrap;
}

.vir-widget .in-room-banner__actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }

.vir-widget .in-room-banner__actions .btn--ghost {
  color: rgba(255,255,255,0.75); border-color: rgba(255,255,255,0.2);
}
.vir-widget .in-room-banner__actions .btn--ghost:hover {
  background: rgba(255,255,255,0.1); color: #fff;
}

/* ── Scene brief chips ── */
.vir-widget .sbc { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 4px; }
.vir-widget .sbc--plain .sbc__item { font-weight: 600; }
.vir-widget .sbc--plain .sbc__item--subtle { font-weight: 400; opacity: 0.75; font-style: italic; }
.vir-widget .sbc--plain .sbc__sep { opacity: 0.4; }

/* ── In-room results panel ── */
.vir-widget .vir-results {
  background: var(--vir-bg);
  border-top: 1px solid var(--vir-border);
  border-bottom: 1px solid var(--vir-border);
  padding: 16px 24px;
}

.vir-widget .vir-results__label {
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.5px; color: var(--vir-text-subtle); margin-bottom: 12px;
}

.vir-widget .vir-results__scroll {
  display: flex; gap: 12px; overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: thin;
}

.vir-widget .vir-result-card {
  flex-shrink: 0;
  width: 180px;
  background: var(--vir-surface);
  border: 1px solid var(--vir-border);
  border-radius: var(--vir-r);
  overflow: hidden;
}

.vir-widget .vir-result-card--ready { border-color: var(--vir-green); border-width: 1.5px; }

.vir-widget .vir-result-card__img-wrap {
  position: relative; width: 100%; aspect-ratio: 1; overflow: hidden; background: #F2EDE6;
}

.vir-widget .vir-result-card__img { width: 100%; height: 100%; object-fit: cover; display: block; }

.vir-widget .vir-result-card__original {
  width: 100%; height: 100%; object-fit: contain; display: block; background: #F9F8F5;
}

.vir-widget .vir-result-card__loading {
  position: absolute; inset: 0; background: rgba(0,0,0,0.3);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; color: #fff; font-size: 12px; font-weight: 500;
}

.vir-widget .vir-result-card__badge {
  position: absolute; bottom: 6px; left: 6px;
  background: var(--vir-green); color: #fff;
  font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 100px;
}

.vir-widget .vir-result-card__body { padding: 8px 10px 10px; }
.vir-widget .vir-result-card__title { font-size: 12px; font-weight: 600; line-height: 1.3; margin-bottom: 2px; }
.vir-widget .vir-result-card__price { font-size: 13px; font-weight: 700; color: var(--vir-text); }

/* ── Buttons ── */
.vir-widget .btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 18px; border: 1.5px solid transparent;
  border-radius: var(--vir-r-sm);
  font-family: inherit; font-size: 14px; font-weight: 600;
  cursor: pointer; transition: all 0.15s; white-space: nowrap; line-height: 1;
}

.vir-widget .btn--primary { background: #1A1916; color: #fff; border-color: #1A1916; }
.vir-widget .btn--primary:hover:not(:disabled) { background: #3D3B36; border-color: #3D3B36; }
.vir-widget .btn--primary:disabled { opacity: 0.35; cursor: not-allowed; }

.vir-widget .btn--ghost { background: transparent; color: var(--vir-text-muted); border-color: transparent; }
.vir-widget .btn--ghost:hover { background: var(--vir-bg); color: var(--vir-text); }

.vir-widget .btn--outline { background: transparent; color: var(--vir-text); border-color: var(--vir-border-strong); }
.vir-widget .btn--outline:hover { background: var(--vir-bg); }

.vir-widget .btn--sm { padding: 6px 12px; font-size: 13px; }
.vir-widget .btn--xs { padding: 4px 8px; font-size: 12px; }
.vir-widget .btn--lg { padding: 12px 24px; font-size: 15px; }

/* ── Modal ── */
.vir-widget .modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.5); backdrop-filter: blur(2px);
  z-index: 2147483647;
  display: flex; align-items: center; justify-content: center; padding: 20px;
}

.vir-widget .modal {
  background: var(--vir-surface); border-radius: var(--vir-r-lg); box-shadow: var(--vir-shadow-lg);
  width: 100%; max-width: 860px; max-height: 90vh;
  display: flex; flex-direction: column; overflow: hidden;
}

.vir-widget .modal__header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 20px 24px 16px; border-bottom: 1px solid var(--vir-border); gap: 16px; flex-shrink: 0;
}

.vir-widget .modal__header-left { display: flex; flex-direction: column; gap: 4px; }

.vir-widget .modal__collection-tag {
  font-size: 11px; text-transform: uppercase; letter-spacing: 0.7px;
  color: var(--vir-text-subtle); font-weight: 600;
}

.vir-widget .modal__title { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }

.vir-widget .modal__header-right { display: flex; align-items: center; gap: 16px; }

.vir-widget .modal__steps { display: flex; align-items: center; gap: 6px; font-size: 12px; }

.vir-widget .modal__step { color: var(--vir-text-subtle); font-weight: 500; padding: 3px 8px; border-radius: 100px; }
.vir-widget .modal__step--active { background: var(--vir-blue-light); color: var(--vir-blue); font-weight: 700; }
.vir-widget .modal__step--done { color: var(--vir-green); text-decoration: line-through; opacity: 0.7; }
.vir-widget .modal__step-sep { color: var(--vir-text-subtle); font-size: 11px; }

.vir-widget .modal__close {
  background: none; border: none; cursor: pointer; font-size: 16px;
  color: var(--vir-text-subtle); padding: 4px; border-radius: 4px; line-height: 1; transition: all 0.15s;
}
.vir-widget .modal__close:hover { color: var(--vir-text); background: var(--vir-bg); }

.vir-widget .modal__body { flex: 1; overflow-y: auto; padding: 24px; }

.vir-widget .modal__two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }

.vir-widget .modal__footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 24px; border-top: 1px solid var(--vir-border); flex-shrink: 0; gap: 12px;
}

.vir-widget .modal__footer-right { display: flex; align-items: center; gap: 8px; margin-left: auto; }

/* ── Setup sections ── */
.vir-widget .setup-section-header { margin-bottom: 16px; }
.vir-widget .setup-section-title { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
.vir-widget .setup-section-subtitle { font-size: 13px; color: var(--vir-text-muted); }
.vir-widget .setup-loading { padding: 32px; text-align: center; color: var(--vir-text-muted); font-size: 14px; }

/* ── Room selector ── */
.vir-widget .room-selector { display: flex; flex-direction: column; gap: 16px; }

.vir-widget .setup-upload-subtitle {
  font-size: 14px; color: var(--vir-text-muted); margin-bottom: 4px; line-height: 1.5;
}

/* Desktop: large drop zone */
.vir-widget .upload-dropzone {
  width: 100%; display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 48px 24px;
  border: 2px dashed var(--vir-border-strong); border-radius: var(--vir-r-lg);
  background: var(--vir-bg); cursor: pointer; font-family: inherit; text-align: center;
  transition: border-color 0.15s, background 0.15s;
}
.vir-widget .upload-dropzone:hover { border-color: var(--vir-blue); background: var(--vir-blue-light); }
.vir-widget .upload-dropzone__icon { font-size: 36px; line-height: 1; color: var(--vir-text-subtle); }
.vir-widget .upload-dropzone__title { font-size: 16px; font-weight: 700; color: var(--vir-text); }
.vir-widget .upload-dropzone__hint { font-size: 12px; color: var(--vir-text-subtle); }
.vir-widget .upload-dropzone__cta {
  margin-top: 8px; padding: 10px 28px;
  background: var(--vir-accent); color: var(--vir-accent-text);
  border-radius: var(--vir-r); font-size: 14px; font-weight: 600;
  pointer-events: none;
}

/* Mobile: two side-by-side action cards */
.vir-widget .upload-actions { display: flex; gap: 12px; }

.vir-widget .upload-action-btn {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 28px 16px;
  border: 2px solid var(--vir-border); border-radius: var(--vir-r-lg);
  background: var(--vir-surface); font-family: inherit; cursor: pointer;
  transition: border-color 0.15s, background 0.15s, transform 0.12s;
}
.vir-widget .upload-action-btn:hover:not(:disabled) { border-color: var(--vir-border-strong); background: var(--vir-bg); transform: translateY(-1px); }
.vir-widget .upload-action-btn:disabled { opacity: 0.5; cursor: default; }
.vir-widget .upload-action-btn--primary { border-color: var(--vir-blue); background: var(--vir-blue-light); }
.vir-widget .upload-action-btn--primary:hover:not(:disabled) { background: #dbeafe; }
.vir-widget .upload-action-btn__icon { font-size: 32px; line-height: 1; }
.vir-widget .upload-action-btn__label { font-size: 14px; font-weight: 600; color: var(--vir-text); }


/* ── Placement step (step 2) ── */
.vir-widget .placement-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: start;
}
@media (max-width: 580px) {
  .vir-widget .placement-layout { grid-template-columns: 1fr; gap: 16px; }
}

/* Room photo — left column, preserves aspect ratio, no crop */
.vir-widget .placement-photo {
  position: relative; width: 100%; line-height: 0;
  background: var(--vir-bg); border-radius: var(--vir-r);
  overflow: hidden; border: 1px solid var(--vir-border);
}
.vir-widget .placement-photo__img {
  width: 100%; height: auto; object-fit: contain; display: block;
}
.vir-widget .placement-photo__change {
  position: absolute; top: 8px; right: 8px; display: flex; gap: 6px;
}
.vir-widget .placement-photo__btn {
  padding: 5px 11px;
  background: rgba(255,255,255,0.92); backdrop-filter: blur(6px);
  border: 1px solid rgba(0,0,0,0.1); border-radius: 100px;
  font-family: inherit; font-size: 12px; font-weight: 600; color: var(--vir-text);
  cursor: pointer; transition: background 0.15s; line-height: 1.4;
}
.vir-widget .placement-photo__btn:hover { background: #fff; }

/* Placement section — right column */
.vir-widget .placement-section { display: flex; flex-direction: column; gap: 16px; }
.vir-widget .placement-section__header { display: flex; flex-direction: column; gap: 4px; }
.vir-widget .placement-section__title { font-size: 17px; font-weight: 700; }
.vir-widget .placement-section__subtitle { font-size: 13px; color: var(--vir-text-muted); line-height: 1.4; }

/* Action options — a bit more breathing room */
.vir-widget .action-option { padding: 13px 14px; }

/* ── Quick actions ── */
.vir-widget .quick-actions-panel { display: flex; flex-direction: column; gap: 16px; }
.vir-widget .action-list { display: flex; flex-direction: column; gap: 6px; }

.vir-widget .action-option {
  display: flex; align-items: center; gap: 10px; padding: 11px 14px;
  border: 1.5px solid var(--vir-border); border-radius: var(--vir-r-sm);
  background: var(--vir-surface); cursor: pointer; text-align: left;
  font-family: inherit; font-size: 14px; color: var(--vir-text); transition: all 0.15s;
}
.vir-widget .action-option:hover { border-color: var(--vir-border-strong); background: var(--vir-bg); }
.vir-widget .action-option--selected { border-color: var(--vir-blue); background: var(--vir-blue-light); color: var(--vir-blue); }
.vir-widget .action-option__radio { font-size: 16px; flex-shrink: 0; line-height: 1; color: var(--vir-blue); }
.vir-widget .action-option__label { flex: 1; font-weight: 500; }
.vir-widget .action-option__check { font-size: 13px; color: var(--vir-blue); font-weight: 700; flex-shrink: 0; }

.vir-widget .refinement-input { display: flex; flex-direction: column; gap: 6px; }
.vir-widget .refinement-input__label { font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
.vir-widget .refinement-input__optional { font-weight: 400; color: var(--vir-text-subtle); font-size: 12px; }
.vir-widget .refinement-input__field {
  width: 100%; padding: 9px 12px; border: 1.5px solid var(--vir-border);
  border-radius: var(--vir-r-sm); font-family: inherit; font-size: 14px;
  color: var(--vir-text); background: var(--vir-surface); transition: border-color 0.15s; outline: none;
}
.vir-widget .refinement-input__field:focus { border-color: var(--vir-blue); }
.vir-widget .refinement-input__field::placeholder { color: var(--vir-text-subtle); }

/* ── Spinner ── */
@keyframes vir-spin { to { transform: rotate(360deg); } }
.vir-widget .vir-spinner {
  width: 22px; height: 22px; border: 2.5px solid rgba(255,255,255,0.3);
  border-top-color: #fff; border-radius: 50%; animation: vir-spin 0.8s linear infinite;
}
.vir-widget .vir-spinner--dark {
  border-color: rgba(0,0,0,0.1); border-top-color: var(--vir-text);
}

/* ── PDP render panel (full-bleed widget mode) ── */
.vir-widget .vir-pdp-render {
  position: relative; width: 100%; aspect-ratio: 4 / 3;
  background: var(--vir-bg); border-radius: var(--vir-r-lg);
  overflow: hidden; margin: 12px 0;
}

.vir-widget .vir-pdp-render__img {
  width: 100%; height: 100%; object-fit: cover; display: block;
}

@keyframes vir-curtain-reveal {
  from { clip-path: inset(0 100% 0 0); }
  to   { clip-path: inset(0 0% 0 0); }
}
.vir-widget .vir-pdp-render__img--reveal {
  animation: vir-curtain-reveal 0.85s cubic-bezier(0.4, 0, 0.2, 1) both;
}

.vir-widget .vir-pdp-render__generating {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; color: var(--vir-text-muted); font-size: 13px;
}

/* Floating close button — always visible top-right */
.vir-widget .vir-pdp-render__close {
  position: absolute; top: 10px; right: 10px; z-index: 2;
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.38); backdrop-filter: blur(4px);
  border: none; border-radius: 50%;
  color: #fff; font-size: 13px; cursor: pointer;
  transition: background 0.15s;
}
.vir-widget .vir-pdp-render__close:hover { background: rgba(0,0,0,0.58); }

/* Floating edit button — bottom-right, appears after render */
.vir-widget .vir-pdp-render__fab {
  position: absolute; bottom: 12px; right: 12px; z-index: 2;
  display: flex; align-items: center; gap: 6px;
  padding: 8px 14px;
  background: rgba(255,255,255,0.92); backdrop-filter: blur(8px);
  border: 1px solid rgba(0,0,0,0.08); border-radius: 100px;
  font-family: inherit; font-size: 13px; font-weight: 600;
  color: var(--vir-text); cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.14);
  transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
}
.vir-widget .vir-pdp-render__fab:hover {
  background: #fff; transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(0,0,0,0.18);
}

/* ── Recommendations carousel ── */
.vir-widget .vir-rec {
  padding: 20px 0; border-top: 1px solid var(--vir-border);
}
.vir-widget .vir-rec__header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14px; padding: 0 2px;
}
.vir-widget .vir-rec__title-group { display: flex; flex-direction: column; gap: 3px; }
.vir-widget .vir-rec__title { font-size: 16px; font-weight: 700; }
.vir-widget .vir-rec__room-tag {
  font-size: 11px; color: var(--vir-accent); font-weight: 600; letter-spacing: 0.01em;
}
.vir-widget .vir-rec__nav { display: flex; gap: 6px; }
.vir-widget .vir-rec__arrow {
  width: 32px; height: 32px; border-radius: 50%; border: 1.5px solid var(--vir-border);
  background: var(--vir-surface); font-size: 18px; line-height: 1;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: border-color 0.15s, background 0.15s; color: var(--vir-text);
}
.vir-widget .vir-rec__arrow:hover { border-color: var(--vir-text); background: var(--vir-bg); }
.vir-widget .vir-rec__strip {
  display: grid; grid-auto-flow: column;
  grid-auto-columns: calc((100% - 36px) / 4);
  gap: 12px; overflow-x: auto; scroll-snap-type: x mandatory;
  scroll-behavior: smooth; -webkit-overflow-scrolling: touch;
  padding-bottom: 4px; scrollbar-width: none;
}
@media (max-width: 600px) {
  .vir-widget .vir-rec__strip { grid-auto-columns: calc((100% - 12px) / 2); }
}
.vir-widget .vir-rec__strip::-webkit-scrollbar { display: none; }
.vir-widget .vir-rec__card {
  scroll-snap-align: start;
  display: flex; flex-direction: column; gap: 8px;
  text-decoration: none; color: inherit; cursor: pointer;
}
.vir-widget .vir-rec__card:hover .vir-rec__card-img {
  border-color: var(--vir-accent);
}
.vir-widget .vir-rec__card-img {
  position: relative; width: 100%; aspect-ratio: 4 / 3;
  border-radius: var(--vir-r-sm); overflow: hidden;
  background: var(--vir-bg); border: 1px solid var(--vir-border);
  transition: border-color 0.15s;
}
.vir-widget .vir-rec__product-img {
  width: 100%; height: 100%; object-fit: cover; display: block;
  transition: opacity 0.3s;
}
.vir-widget .vir-rec__product-img--hidden { opacity: 0; }
.vir-widget .vir-rec__render-img {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; display: block;
  animation: vir-fadein 0.4s ease;
}
.vir-widget .vir-rec__img-placeholder {
  width: 100%; height: 100%; background: var(--vir-bg);
}
.vir-widget .vir-rec__render-overlay {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.6); backdrop-filter: blur(2px);
}
.vir-widget .vir-rec__room-badge {
  position: absolute; bottom: 6px; left: 6px;
  background: rgba(255,255,255,0.92); color: var(--vir-accent);
  font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 20px;
  letter-spacing: 0.01em;
}
.vir-widget .vir-rec__card-info { display: flex; flex-direction: column; gap: 2px; }
.vir-widget .vir-rec__card-title {
  font-size: 13px; font-weight: 500; line-height: 1.3;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.vir-widget .vir-rec__card-price { font-size: 13px; font-weight: 700; }
@keyframes vir-fadein { from { opacity: 0; } to { opacity: 1; } }

/* ── Carousel slot ── */
.vir-widget .vir-carousel-slot {
  position: relative; width: 100%; aspect-ratio: 1;
  background: var(--vir-bg); border: 2px dashed var(--vir-border);
  border-radius: var(--vir-r-sm); overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: border-color 0.15s, background 0.15s;
}
.vir-widget .vir-carousel-slot:hover { border-color: var(--vir-blue); background: var(--vir-blue-light); }
.vir-widget .vir-carousel-slot:focus { outline: 2px solid var(--vir-blue); outline-offset: 2px; }
.vir-widget .vir-carousel-slot--active { border-style: solid; border-color: var(--vir-border); cursor: default; }
.vir-widget .vir-carousel-slot--active:hover { background: var(--vir-bg); border-color: var(--vir-border); }
.vir-widget .vir-carousel-slot__placeholder {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 20px; text-align: center; pointer-events: none;
}
.vir-widget .vir-carousel-slot__spark { font-size: 28px; color: var(--vir-blue); }
.vir-widget .vir-carousel-slot__label { font-size: 13px; font-weight: 600; color: var(--vir-text-muted); line-height: 1.4; }
.vir-widget .vir-carousel-slot__loading {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  font-size: 12px; color: var(--vir-text-muted);
}
.vir-widget .vir-carousel-slot__img { width: 100%; height: 100%; object-fit: cover; display: block; }
.vir-widget .vir-carousel-slot__overlay {
  position: absolute; bottom: 0; left: 0; right: 0;
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 10px; background: rgba(255,255,255,0.9);
  backdrop-filter: blur(4px); border-top: 1px solid var(--vir-border);
}
.vir-widget .vir-carousel-slot__room-tag { font-size: 11px; font-weight: 600; color: var(--vir-text-muted); }
.vir-widget .vir-carousel-slot__edit {
  font-size: 11px; font-weight: 600; color: var(--vir-blue); background: none;
  border: none; cursor: pointer; padding: 2px 4px; font-family: inherit;
}
.vir-widget .vir-carousel-slot__edit:hover { text-decoration: underline; }

`
