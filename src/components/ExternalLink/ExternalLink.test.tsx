import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { ExternalLink } from './ExternalLink';

const URL = 'https://loja.test/produto/p';

describe('ExternalLink', () => {
  afterEach(() => vi.restoreAllMocks());

  test('on its own it is an ordinary new-tab link', () => {
    render(<ExternalLink href={URL}>Abrir</ExternalLink>);
    const link = screen.getByRole('link', { name: 'Abrir' });
    expect(link).toHaveAttribute('href', URL);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
    // not prevented: the browser follows the link
    expect(fireEvent.click(link)).toBe(true);
  });

  test('inside Domo the click is handed to the surrounding page', () => {
    const postMessage = vi.fn();
    vi.spyOn(window, 'parent', 'get').mockReturnValue({
      postMessage,
    } as unknown as Window);
    render(<ExternalLink href={URL}>Abrir</ExternalLink>);
    // prevented: the sandboxed link would do nothing, so Domo opens it instead
    expect(fireEvent.click(screen.getByRole('link', { name: 'Abrir' }))).toBe(
      false,
    );
    expect(postMessage).toHaveBeenCalledTimes(1);
    const [message, target] = postMessage.mock.calls[0];
    expect(JSON.parse(message as string)).toEqual({
      event: 'navigate',
      url: URL,
      isNewWindow: true,
    });
    expect(target).toBe('*');
  });
});
