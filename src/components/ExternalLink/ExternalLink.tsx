import { type FC, type ReactNode } from 'react';
import { isEmbedded, openThroughDomo } from 'utils/links';

export interface ExternalLinkProps {
  /** An http(s) address on another site (e.g. a store's product page). */
  href: string;
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
  title?: string;
}

/**
 * A link to another site that opens in a new tab, both on its own and inside Domo.
 * Inside Domo the sandbox blocks the link itself, so the click is handed to Domo to open.
 */
export const ExternalLink: FC<ExternalLinkProps> = ({
  href,
  children,
  ...rest
}) => (
  <a
    {...rest}
    href={href}
    target="_blank"
    rel="noreferrer"
    onClick={(e) => {
      if (!isEmbedded()) return; // a normal page: the browser opens the link itself
      e.preventDefault();
      openThroughDomo(href);
    }}
  >
    {children}
  </a>
);
