import { type FC, type MouseEvent, useEffect, useState } from 'react';

import styles from './ProductThumb.module.scss';

export interface ProductThumbProps {
  /** Picture on the store's own site; anything that is not an http(s) URL is ignored. */
  src?: string | null;
  size?: number;
  /** Show a large preview beside the picture while the pointer is over it. */
  zoom?: boolean;
}

const PREVIEW = 240;
const GAP = 12;

const usable = (src?: string | null): src is string =>
  !!src && /^https?:\/\//i.test(src);

/**
 * A product picture loaded straight from the store. It is decoration next to the SKU name
 * (empty alt), and falls back to a neutral tile when there is no picture or it fails to load.
 */
export const ProductThumb: FC<ProductThumbProps> = ({
  src,
  size = 36,
  zoom = false,
}) => {
  const [failed, setFailed] = useState(false);
  const [preview, setPreview] = useState<{ left: number; top: number } | null>(
    null,
  );
  useEffect(() => {
    setFailed(false);
    setPreview(null);
  }, [src]);

  const shown = usable(src) && !failed;

  // Placed with fixed coordinates, so a scrolling table cannot clip it. It opens under the
  // picture (above when there is no room), which keeps the product's name readable beside it.
  const openPreview = (e: MouseEvent<HTMLSpanElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const fitsBelow = box.bottom + GAP + PREVIEW <= window.innerHeight;
    setPreview({
      left: Math.max(
        GAP,
        Math.min(box.left, window.innerWidth - PREVIEW - GAP),
      ),
      top: fitsBelow
        ? box.bottom + GAP
        : Math.max(GAP, box.top - GAP - PREVIEW),
    });
  };

  return (
    <span
      className={styles.thumb}
      style={{ height: size, width: size }}
      onMouseEnter={zoom && shown ? openPreview : undefined}
      onMouseLeave={zoom ? () => setPreview(null) : undefined}
    >
      {shown && (
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      )}
      {shown && preview && (
        <span
          className={styles.preview}
          style={{ ...preview, height: PREVIEW, width: PREVIEW }}
          data-testid="thumb-preview"
        >
          <img src={src} alt="" referrerPolicy="no-referrer" />
        </span>
      )}
    </span>
  );
};
