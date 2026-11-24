import { type FC, useEffect, useState } from 'react';

import styles from './ProductThumb.module.scss';

export interface ProductThumbProps {
  /** Picture on the store's own site; anything that is not an http(s) URL is ignored. */
  src?: string | null;
  size?: number;
}

const usable = (src?: string | null): src is string =>
  !!src && /^https?:\/\//i.test(src);

/**
 * A product picture loaded straight from the store. It is decoration next to the SKU name
 * (empty alt), and falls back to a neutral tile when there is no picture or it fails to load.
 */
export const ProductThumb: FC<ProductThumbProps> = ({ src, size = 36 }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  return (
    <span className={styles.thumb} style={{ height: size, width: size }}>
      {usable(src) && !failed && (
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
};
