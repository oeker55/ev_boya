import PaintClient from "../paint-client";

export default function PaintPage() {
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <h1>Ayvatullu Ev Boya</h1>
            <p>Ev boya projeksiyonu</p>
          </div>
        </div>

        <div className="top-actions">
          <a className="button" id="adminLink" href="/admin">
            <i data-lucide="lock-keyhole" aria-hidden="true" />
            <span>Yönetim</span>
          </a>
          <button className="button" id="publicLinkButton" type="button" hidden>
            <i data-lucide="external-link" aria-hidden="true" />
            <span>Public görünüm</span>
          </button>
          <button className="button" id="downloadButton" type="button">
            <i data-lucide="download" aria-hidden="true" />
            <span>PNG indir</span>
          </button>
          <button className="icon-button" id="logoutButton" type="button" aria-label="Çıkış" hidden>
            <i data-lucide="log-out" aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="workspace">
        <section className="preview-panel" aria-label="Ev önizleme">
          <div className="preview-toolbar">
            <div className="photo-meta">
              <span id="photoName">Varsayılan önizleme</span>
              <strong id="canvasSize">1200 x 1600</strong>
            </div>
            <div className="toolbar-buttons">
              <label className="switch">
                <input id="originalToggle" type="checkbox" />
                <span>Orijinal</span>
              </label>
              <label className="switch">
                <input id="maskToggle" type="checkbox" />
                <span>Maske</span>
              </label>
            </div>
          </div>

          <div className="stage-wrap">
            <canvas id="paintCanvas" aria-label="Boyanmış ev görüntüsü" />
          </div>
        </section>

        <aside className="control-panel" aria-label="Renk ve maske kontrolleri">
          <section className="control-section admin-section" id="adminPanel" hidden>
            <div className="section-heading">
              <span>Resim paneli</span>
              <button className="link-button" id="copyPublicLinkButton" type="button">
                <i data-lucide="copy" aria-hidden="true" />
                Link
              </button>
            </div>
            <form id="uploadForm" className="upload-form">
              <label className="file-drop">
                <i data-lucide="upload" aria-hidden="true" />
                <span>Resim seç</span>
                <input id="uploadInput" type="file" accept="image/*" />
              </label>
              <button className="button button-primary" type="submit">
                <i data-lucide="cloud-upload" aria-hidden="true" />
                <span>Yükle</span>
              </button>
            </form>
            <button className="button ai-mask-button" id="aiMaskButton" type="button">
              <i data-lucide="sparkles" aria-hidden="true" />
              <span>AI ile maske oluÅŸtur</span>
            </button>
            <div id="imageList" className="image-list" />
            <output id="saveStatus" className="save-status" />
          </section>

          <section className="control-section current-section">
            <div className="section-heading">
              <span>Seçili renk</span>
              <a
                id="sourceLink"
                href="https://biancastella.com.tr/kartela/"
                target="_blank"
                rel="noreferrer"
              >
                Kartela
              </a>
            </div>
            <div id="currentColor" className="current-color">
              <button
                id="currentSwatch"
                className="current-swatch"
                type="button"
                aria-label="Renk seç"
              />
              <div>
                <h2 id="currentName">Kum Beji</h2>
                <p>
                  <span id="currentCode">Kod</span>
                  <span id="currentHex">#000000</span>
                </p>
              </div>
            </div>
            <div
              id="colorSlotTabs"
              className="color-slot-tabs"
              role="group"
              aria-label="Renk hedefi"
            >
              <button
                className="slot-button is-active"
                type="button"
                data-color-slot="primary"
                aria-pressed="true"
              >
                <i data-lucide="paintbrush" aria-hidden="true" />
                <span>Ana renk</span>
              </button>
              <button
                className="slot-button"
                type="button"
                data-color-slot="secondary"
                aria-pressed="false"
              >
                <i data-lucide="square" aria-hidden="true" />
                <span>Ikinci renk</span>
              </button>
            </div>
            <div className="step-row">
              <button
                className="icon-button"
                id="prevButton"
                type="button"
                aria-label="Önceki renk"
              >
                <i data-lucide="chevron-left" aria-hidden="true" />
              </button>
              <button className="button button-wide" id="playButton" type="button">
                <i data-lucide="play" aria-hidden="true" />
                <span>Tek tek uygula</span>
              </button>
              <button
                className="icon-button"
                id="nextButton"
                type="button"
                aria-label="Sonraki renk"
              >
                <i data-lucide="chevron-right" aria-hidden="true" />
              </button>
            </div>
            <label className="range-field">
              <span>Geçiş hızı</span>
              <input
                id="speedRange"
                type="range"
                min="300"
                max="2400"
                step="100"
                defaultValue="900"
              />
            </label>
          </section>

          <section className="control-section">
            <div className="section-heading">
              <span>Cephe alanları</span>
              <button className="link-button" id="resetMaskButton" type="button">
                <i data-lucide="rotate-ccw" aria-hidden="true" />
                Sıfırla
              </button>
            </div>
            <div id="areaToggles" className="area-toggles" />
            <label className="range-field intensity-field">
              <span>Boya yoğunluğu</span>
              <input
                id="opacityRange"
                type="range"
                min="20"
                max="100"
                step="1"
                defaultValue="100"
              />
            </label>
            <div className="edit-row">
              <label className="switch">
                <input id="editMaskToggle" type="checkbox" />
                <span>Maskeyi düzenle</span>
              </label>
              <select id="editAreaSelect" aria-label="Düzenlenecek alan" />
            </div>
            <div className="edit-tools" aria-label="Maske nokta araçları">
              <button
                className="icon-button"
                id="moveTargetButton"
                type="button"
                aria-label="Seçili alanı taşı"
                title="Seçili alanı taşı"
              >
                <i data-lucide="move" aria-hidden="true" />
              </button>
              <button
                className="icon-button"
                id="addHoleButton"
                type="button"
                aria-label="Boyanmayacak alan ekle"
                title="Boyanmayacak alan ekle"
              >
                <i data-lucide="square-plus" aria-hidden="true" />
              </button>
              <button
                className="icon-button"
                id="addPointButton"
                type="button"
                aria-label="Nokta ekle"
                title="Nokta ekle"
              >
                <i data-lucide="plus" aria-hidden="true" />
              </button>
              <button
                className="icon-button"
                id="deletePointButton"
                type="button"
                aria-label="Seçili noktayı sil"
                title="Seçili noktayı sil"
              >
                <i data-lucide="trash-2" aria-hidden="true" />
              </button>
              <button
                className="icon-button"
                id="deleteHoleButton"
                type="button"
                aria-label="Seçili boyanmayacak alanı sil"
                title="Seçili boyanmayacak alanı sil"
              >
                <i data-lucide="square-x" aria-hidden="true" />
              </button>
              <button
                className="icon-button"
                id="copyPositionButton"
                type="button"
                aria-label="Konumu kopyala"
                title="Konumu kopyala"
              >
                <i data-lucide="copy" aria-hidden="true" />
              </button>
            </div>
            <div className="edit-tools" aria-label="Maske çizim araçları">
              <button
                className="icon-button"
                id="drawPaintButton"
                type="button"
                aria-label="Boya alanı çiz"
                title="Boya alanı çiz"
              >
                <i data-lucide="pencil" aria-hidden="true" />
              </button>
              <button
                className="icon-button"
                id="drawHoleButton"
                type="button"
                aria-label="Boyanmayacak alan çiz"
                title="Boyanmayacak alan çiz"
              >
                <i data-lucide="scissors" aria-hidden="true" />
              </button>
              <button
                className="icon-button"
                id="finishDrawButton"
                type="button"
                aria-label="Çizimi bitir"
                title="Çizimi bitir"
              >
                <i data-lucide="check" aria-hidden="true" />
              </button>
              <button
                className="icon-button"
                id="cancelDrawButton"
                type="button"
                aria-label="Çizimi iptal et"
                title="Çizimi iptal et"
              >
                <i data-lucide="x" aria-hidden="true" />
              </button>
              <button
                className="icon-button"
                id="clearMaskButton"
                type="button"
                aria-label="Maskeyi temizle"
                title="Maskeyi temizle"
              >
                <i data-lucide="eraser" aria-hidden="true" />
              </button>
              <button
                className="icon-button"
                id="exportMaskButton"
                type="button"
                aria-label="Maskeyi kopyala"
                title="Maskeyi kopyala"
              >
                <i data-lucide="clipboard" aria-hidden="true" />
              </button>
            </div>
            <div className="edit-tools flag-tools admin-only" aria-label="Bayrak araÃ§larÄ±">
              <button
                className="icon-button"
                id="addFlagButton"
                type="button"
                aria-label="Bayrak ekle"
                title="Bayrak ekle"
              >
                <i data-lucide="flag" aria-hidden="true" />
              </button>
              <button
                className="icon-button"
                id="flagSmallerButton"
                type="button"
                aria-label="BayraÄŸÄ± kÃ¼Ã§Ã¼lt"
                title="BayraÄŸÄ± kÃ¼Ã§Ã¼lt"
              >
                <i data-lucide="minus" aria-hidden="true" />
              </button>
              <button
                className="icon-button"
                id="flagLargerButton"
                type="button"
                aria-label="BayraÄŸÄ± bÃ¼yÃ¼t"
                title="BayraÄŸÄ± bÃ¼yÃ¼t"
              >
                <i data-lucide="plus" aria-hidden="true" />
              </button>
              <button
                className="icon-button"
                id="deleteFlagButton"
                type="button"
                aria-label="BayraÄŸÄ± sil"
                title="BayraÄŸÄ± sil"
              >
                <i data-lucide="trash-2" aria-hidden="true" />
              </button>
            </div>
            <output id="targetPosition" className="target-position">
              x 0 · y 0 · w 0 · h 0
            </output>
          </section>

          <section className="control-section palette-section">
            <div className="section-heading">
              <span>Renkler</span>
              <strong id="resultCount">0</strong>
            </div>
            <div className="filters">
              <label className="search-field">
                <i data-lucide="search" aria-hidden="true" />
                <input
                  id="searchInput"
                  type="search"
                  placeholder="Renk, kod veya hex ara"
                  autoComplete="off"
                />
              </label>
              <select id="familySelect" aria-label="Renk serisi" />
            </div>
            <div id="swatchGrid" className="swatch-grid" aria-label="Ayvatullu renk seçenekleri" />
          </section>
        </aside>
      </main>
      <div className="mobile-download-footer">
        <button className="button button-primary" id="downloadButtonMobile" type="button">
          <i data-lucide="download" aria-hidden="true" />
          <span>PNG indir</span>
        </button>
      </div>
      <div className="admin-overlay" id="adminOverlay" hidden>
        <form className="login-panel" id="loginForm">
          <div className="login-heading">
            <span className="brand-mark" aria-hidden="true" />
            <strong>Yönetim</strong>
          </div>
          <label>
            <span>Kullanıcı adı</span>
            <input id="loginUsername" type="text" autoComplete="username" defaultValue="admin" />
          </label>
          <label>
            <span>Şifre</span>
            <input id="loginPassword" type="password" autoComplete="current-password" />
          </label>
          <button className="button button-primary" type="submit">
            <i data-lucide="log-in" aria-hidden="true" />
            <span>Giriş yap</span>
          </button>
          <output id="loginStatus" className="save-status" />
        </form>
      </div>
      <PaintClient />
    </div>
  );
}
