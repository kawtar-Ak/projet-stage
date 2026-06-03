import { useEffect, useRef, useState } from 'react';

function SyncedHorizontalScroll({ children, className = '', topClassName = '' }) {
  const topScrollRef = useRef(null);
  const contentScrollRef = useRef(null);
  const syncingRef = useRef(false);
  const [scrollWidth, setScrollWidth] = useState(0);

  useEffect(() => {
    const content = contentScrollRef.current;
    if (!content) return undefined;

    const updateWidth = () => setScrollWidth(content.scrollWidth);
    updateWidth();

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateWidth) : null;
    observer?.observe(content);
    window.addEventListener('resize', updateWidth);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, [children]);

  const syncScroll = (source, target) => {
    if (syncingRef.current || !source.current || !target.current) return;
    syncingRef.current = true;
    target.current.scrollLeft = source.current.scrollLeft;
    requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  };

  return (
    <div className={`${className} synced-table-scroll`.trim()}>
      <div
        className={`synced-table-scroll-top ${topClassName}`.trim()}
        ref={topScrollRef}
        onScroll={() => syncScroll(topScrollRef, contentScrollRef)}
        aria-hidden="true"
      >
        <div style={{ width: Math.max(scrollWidth, 1), height: 1 }} />
      </div>
      <div
        className="synced-table-scroll-body"
        ref={contentScrollRef}
        onScroll={() => syncScroll(contentScrollRef, topScrollRef)}
      >
        {children}
      </div>
    </div>
  );
}

export default SyncedHorizontalScroll;
