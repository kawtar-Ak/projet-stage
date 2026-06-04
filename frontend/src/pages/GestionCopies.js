import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const DB_NAME = 'gestion-courrier-folders';
const STORE_NAME = 'handles';
const ROOT_HANDLE_KEY = 'copies-root';
const SUPPORTED_EXTENSIONS = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'tif', 'tiff'];

function GestionCopies() {
  const { t, i18n } = useTranslation();
  const isArabic = (i18n.resolvedLanguage || i18n.language || 'fr').startsWith('ar');
  const [directoryHandle, setDirectoryHandle] = useState(null);
  const [directoryName, setDirectoryName] = useState(localStorage.getItem('copiesDirectoryName') || '');
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const fallbackInputRef = useRef(null);

  useEffect(() => {
    restoreDirectoryHandle();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const filteredDocuments = useMemo(() => {
    const keyword = normalize(query);
    if (!keyword) return documents;
    return documents.filter((doc) => normalize(`${doc.name} ${doc.path} ${doc.extension}`).includes(keyword));
  }, [documents, query]);

  const stats = useMemo(() => {
    const pdfCount = documents.filter((doc) => doc.extension === 'pdf').length;
    return {
      total: documents.length,
      pdf: pdfCount,
      images: documents.filter((doc) => ['jpg', 'jpeg', 'png', 'tif', 'tiff'].includes(doc.extension)).length,
      other: documents.length - pdfCount
    };
  }, [documents]);

  const restoreDirectoryHandle = async () => {
    if (!('showDirectoryPicker' in window)) return;

    try {
      const savedHandle = await readStoredHandle();
      if (!savedHandle) return;

      const permission = await verifyPermission(savedHandle, false);
      setDirectoryHandle(savedHandle);
      setDirectoryName(savedHandle.name || directoryName);

      if (permission) {
        await scanDirectory(savedHandle);
      } else {
        setStatus(t('dossier_conserve_actualiser'));
      }
    } catch {
      setStatus(t('dossier_enregistre_non_restaure'));
    }
  };

  const chooseDirectory = async () => {
    if (!('showDirectoryPicker' in window)) {
      fallbackInputRef.current?.click();
      return;
    }

    try {
      const handle = await window.showDirectoryPicker({ mode: 'read' });
      await storeHandle(handle);
      localStorage.setItem('copiesDirectoryName', handle.name);
      setDirectoryHandle(handle);
      setDirectoryName(handle.name);
      setSelectedDocument(null);
      setStatus('');
      await scanDirectory(handle);
    } catch (error) {
      if (error.name !== 'AbortError') {
        setStatus(t('impossible_selectionner_dossier'));
      }
    }
  };

  const refreshDirectory = async () => {
    if (!directoryHandle) {
      await chooseDirectory();
      return;
    }

    const allowed = await verifyPermission(directoryHandle, true);
    if (!allowed) {
      setStatus(t('autorisation_refusee_dossier'));
      return;
    }

    await scanDirectory(directoryHandle);
  };

  const handleFallbackFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    const mapped = files
      .filter((file) => SUPPORTED_EXTENSIONS.includes(getExtension(file.name)))
      .map((file, index) => ({
        id: `${file.webkitRelativePath || file.name}-${index}`,
        name: file.name,
        path: file.webkitRelativePath || file.name,
        extension: getExtension(file.name),
        size: file.size,
        lastModified: file.lastModified,
        file
      }))
      .sort(sortDocuments);

    setDocuments(mapped);
    setDirectoryName(files[0]?.webkitRelativePath?.split('/')[0] || t('dossier_selectionne'));
    setDirectoryHandle(null);
    setSelectedDocument(null);
    setStatus(t('mode_compatible_dossier_session'));
  };

  const scanDirectory = async (handle) => {
    setLoading(true);
    setStatus('');

    try {
      const items = [];
      await collectDocuments(handle, '', items);
      items.sort(sortDocuments);
      setDocuments(items);
      const nextSelected = items.find((item) => item.path === selectedDocument?.path) || items[0] || null;
      setSelectedDocument(nextSelected);
      if (nextSelected) {
        await loadPreview(nextSelected);
      } else if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl('');
      }
      setStatus(t('documents_charges', { count: items.length }));
    } catch {
      setStatus(t('erreur_lecture_dossier'));
    } finally {
      setLoading(false);
    }
  };

  const selectDocument = async (document) => {
    setSelectedDocument(document);
    await loadPreview(document);
  };

  const loadPreview = async (document) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    try {
      const file = document.file || await document.handle.getFile();
      setPreviewUrl(URL.createObjectURL(file));
    } catch {
      setPreviewUrl('');
      setStatus(t('impossible_ouvrir_fichier'));
    }
  };

  const printDocument = async (document = selectedDocument) => {
    if (!document) return;

    try {
      const file = document.file || await document.handle.getFile();
      const url = URL.createObjectURL(file);
      printBlobUrl(url);
    } catch {
      setStatus(t('impossible_imprimer_document'));
    }
  };

  return (
    <div className="copies-page copies-management-page" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="copies-header">
        <div>
          <span className="copies-eyebrow">{t('service_notification_copies')}</span>
          <h1>{t('gestion_copies')}</h1>
          <p>{directoryName ? t('dossier_actif', { name: directoryName }) : t('choisir_dossier_commencer')}</p>
        </div>
        <div className="copies-header-actions">
          <button type="button" className="btn-secondary" onClick={refreshDirectory} disabled={loading}>
            {t('actualiser')}
          </button>
          <button type="button" className="btn-primary" onClick={chooseDirectory} disabled={loading}>
            {t('choisir_dossier')}
          </button>
          <input
            ref={fallbackInputRef}
            type="file"
            webkitdirectory="true"
            directory="true"
            multiple
            onChange={handleFallbackFiles}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      <div className="copies-toolbar">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('placeholder_recherche_copies')}
        />
        <div className="copies-chips">
          <span>{t('resultats_count', { count: filteredDocuments.length })}</span>
          <span>{t('documents_count', { count: stats.total })}</span>
          <span>{stats.pdf} PDF</span>
          <span>{t('images_count', { count: stats.images })}</span>
        </div>
      </div>

      {status && <div className="copies-status">{status}</div>}

      <div className="copies-workspace">
        <aside className="copies-list">
          <div className="copies-list-title">
            <div>
              <strong>{t('documents_du_dossier')}</strong>
              <small>{loading ? t('lecture_en_cours') : t('fichiers_count', { count: filteredDocuments.length })}</small>
            </div>
          </div>

          {filteredDocuments.length === 0 ? (
            <div className="copies-empty">{t('aucun_document_trouve')}</div>
          ) : (
            filteredDocuments.map((document) => (
              <button
                type="button"
                key={document.id}
                className={`copy-file-row${selectedDocument?.path === document.path ? ' active' : ''}`}
                onClick={() => selectDocument(document)}
              >
                <span className="copy-file-type">{document.extension.toUpperCase()}</span>
                <span>
                  <strong>{document.name}</strong>
                  <small>{formatFileSize(document.size)} · {document.path}</small>
                </span>
              </button>
            ))
          )}
        </aside>

        <section className="copies-preview">
          {selectedDocument ? (
            <>
              <div className="copies-preview-header">
                <div>
                  <h2>{selectedDocument.name}</h2>
                  <p>{formatFileSize(selectedDocument.size)} · {selectedDocument.path}</p>
                </div>
                <div className="copies-preview-actions">
                  <button type="button" className="btn-primary" onClick={() => printDocument()}>
                    {t('imprimer')}
                  </button>
                </div>
              </div>

              <DocumentPreview document={selectedDocument} previewUrl={previewUrl} t={t} />
            </>
          ) : (
            <div className="copies-preview-empty">
              <h2>{t('aucun_document_selectionne')}</h2>
              <p>{t('selectionner_document_liste')}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function DocumentPreview({ document, previewUrl, t }) {
  if (!previewUrl) {
    return <div className="copies-preview-empty">{t('cliquer_document_apercu')}</div>;
  }

  if (document.extension === 'pdf') {
    const pdfUrl = `${previewUrl}#page=1&zoom=page-width&navpanes=0`;
    return <iframe className="copies-pdf-frame" title={document.name} src={pdfUrl} />;
  }

  if (['jpg', 'jpeg', 'png'].includes(document.extension)) {
    return <img className="copies-image-preview" src={previewUrl} alt={document.name} />;
  }

  return (
    <div className="copies-preview-empty">
      <h2>{t('apercu_non_disponible')}</h2>
      <p>{t('type_fichier_non_affichable')}</p>
    </div>
  );
}

async function collectDocuments(directoryHandle, parentPath, items) {
  for await (const entry of directoryHandle.values()) {
    const path = parentPath ? `${parentPath}/${entry.name}` : entry.name;

    if (entry.kind === 'directory') {
      await collectDocuments(entry, path, items);
      continue;
    }

    const extension = getExtension(entry.name);
    if (!SUPPORTED_EXTENSIONS.includes(extension)) continue;

    const file = await entry.getFile();
    items.push({
      id: path,
      name: entry.name,
      path,
      extension,
      size: file.size,
      lastModified: file.lastModified,
      handle: entry
    });
  }
}

async function verifyPermission(handle, requestPermission) {
  const options = { mode: 'read' };
  if ((await handle.queryPermission(options)) === 'granted') return true;
  if (!requestPermission) return false;
  return (await handle.requestPermission(options)) === 'granted';
}

function getExtension(fileName) {
  return String(fileName || '').split('.').pop().toLowerCase();
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function sortDocuments(a, b) {
  return a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: 'base' });
}

function formatFileSize(size) {
  if (!Number.isFinite(size)) return '-';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} Ko`;
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
}

function printBlobUrl(url) {
  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.src = url;
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      frame.remove();
    }, 1000);
  };
  document.body.appendChild(frame);
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function storeHandle(handle) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(handle, ROOT_HANDLE_KEY);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function readStoredHandle() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(ROOT_HANDLE_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export default GestionCopies;
