import React, { useEffect, useMemo, useRef, useState } from 'react';

const DB_NAME = 'gestion-courrier-folders';
const STORE_NAME = 'handles';
const ROOT_HANDLE_KEY = 'copies-root';
const SUPPORTED_EXTENSIONS = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'tif', 'tiff'];

function GestionCopies() {
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
        setStatus('Dossier conserve. Cliquez sur Actualiser pour autoriser l acces et recharger les fichiers.');
      }
    } catch {
      setStatus('Le dossier enregistre ne peut pas etre restaure. Choisissez-le de nouveau.');
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
        setStatus('Impossible de selectionner le dossier.');
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
      setStatus('Autorisation refusee pour ce dossier.');
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
    setDirectoryName(files[0]?.webkitRelativePath?.split('/')[0] || 'Dossier selectionne');
    setDirectoryHandle(null);
    setSelectedDocument(null);
    setStatus('Mode compatible: le dossier reste disponible pendant cette session uniquement.');
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
      setStatus(`${items.length} document(s) charge(s).`);
    } catch {
      setStatus('Erreur pendant la lecture du dossier.');
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
      setStatus('Impossible d ouvrir ce fichier.');
    }
  };

  const printDocument = async (document = selectedDocument) => {
    if (!document) return;

    try {
      const file = document.file || await document.handle.getFile();
      const url = URL.createObjectURL(file);
      printBlobUrl(url);
    } catch {
      setStatus('Impossible d imprimer ce document.');
    }
  };

  return (
    <div className="copies-page" dir="rtl">
      <div className="copies-header">
        <div>
          <span className="copies-eyebrow">Service notification et remise des copies</span>
          <h1>Gestion des copies</h1>
          <p>{directoryName ? `Dossier actif : ${directoryName}` : 'Choisissez un dossier pour commencer la recherche.'}</p>
        </div>
        <div className="copies-header-actions">
          <button type="button" className="btn-secondary" onClick={refreshDirectory} disabled={loading}>
            Actualiser
          </button>
          <button type="button" className="btn-primary" onClick={chooseDirectory} disabled={loading}>
            Choisir le dossier
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
          placeholder="Rechercher par nom de fichier, numero ou dossier..."
        />
        <div className="copies-chips">
          <span>{filteredDocuments.length} resultat(s)</span>
          <span>{stats.total} document(s)</span>
          <span>{stats.pdf} PDF</span>
          <span>{stats.images} image(s)</span>
        </div>
      </div>

      {status && <div className="copies-status">{status}</div>}

      <div className="copies-workspace">
        <aside className="copies-list">
          <div className="copies-list-title">
            <div>
              <strong>Documents du dossier</strong>
              <small>{loading ? 'Lecture en cours...' : `${filteredDocuments.length} fichier(s)`}</small>
            </div>
          </div>

          {filteredDocuments.length === 0 ? (
            <div className="copies-empty">Aucun document trouve.</div>
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
                    Imprimer
                  </button>
                </div>
              </div>

              <DocumentPreview document={selectedDocument} previewUrl={previewUrl} />
            </>
          ) : (
            <div className="copies-preview-empty">
              <h2>Aucun document selectionne</h2>
              <p>Choisissez un dossier puis selectionnez un document dans la liste.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function DocumentPreview({ document, previewUrl }) {
  if (!previewUrl) {
    return <div className="copies-preview-empty">Cliquez sur un document pour afficher l apercu.</div>;
  }

  if (document.extension === 'pdf') {
    return <iframe className="copies-pdf-frame" title={document.name} src={previewUrl} />;
  }

  if (['jpg', 'jpeg', 'png'].includes(document.extension)) {
    return <img className="copies-image-preview" src={previewUrl} alt={document.name} />;
  }

  return (
    <div className="copies-preview-empty">
      <h2>Apercu non disponible</h2>
      <p>Ce type de fichier ne peut pas etre affiche directement dans cette zone.</p>
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
