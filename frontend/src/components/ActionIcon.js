import React from "react";

const ICON_PATHS = {
  view: (
    <>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4.5L19 9.5 14.5 5 4 15.5V20Z" />
      <path d="M13.5 6 18 10.5" />
    </>
  ),
  transfer: (
    <>
      <path d="M4 7h12" />
      <path d="M13 4l3 3-3 3" />
      <path d="M20 17H8" />
      <path d="M11 14l-3 3 3 3" />
    </>
  ),
  delete: (
    <>
      <path d="M5 7h14" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M8 7l1-3h6l1 3" />
      <path d="M7 7l1 13h8l1-13" />
    </>
  ),
  archive: (
    <>
      <path d="M4 7h16" />
      <path d="M6 7v13h12V7" />
      <path d="M9 11h6" />
      <path d="M8 4h8l1 3H7l1-3Z" />
    </>
  ),
  link: (
    <>
      <path d="M6 4h8l4 4v12H6V4Z" />
      <path d="M14 4v5h5" />
      <path d="M9 14h6" />
      <path d="M12 11v6" />
    </>
  ),
  reply: (
    <>
      <path d="M4 7h16v11H4V7Z" />
      <path d="m4 8 8 6 8-6" />
      <path d="M16 4v6" />
      <path d="M13 7h6" />
    </>
  ),
  password: (
    <>
      <circle cx="7.5" cy="14.5" r="3.5" />
      <path d="M11 14.5H22" />
      <path d="M18 14.5V18" />
      <path d="M15 14.5V17" />
    </>
  ),
  return: (
    <>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 6 6v5" />
    </>
  ),
  accept: (
    <>
      <path d="M20 6 9 17l-5-5" />
    </>
  ),
  cancel: (
    <>
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </>
  ),
  hide: (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6A2 2 0 0 0 13.4 13.4" />
      <path d="M9.9 4.3A10.8 10.8 0 0 1 12 4c6 0 9.5 8 9.5 8a16.5 16.5 0 0 1-2.1 3.1" />
      <path d="M6.6 6.6C3.9 8.4 2.5 12 2.5 12s3.5 8 9.5 8a10.8 10.8 0 0 0 4-.8" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </>
  ),
  upload: (
    <>
      <path d="M12 21V9" />
      <path d="m7 14 5-5 5 5" />
      <path d="M5 3h14" />
    </>
  ),
  fileText: (
    <>
      <path d="M6 3h8l4 4v14H6V3Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </>
  )
};

function ActionIcon({ name }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
    >
      {ICON_PATHS[name] || ICON_PATHS.view}
    </svg>
  );
}

export default ActionIcon;
