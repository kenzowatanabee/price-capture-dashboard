import { fireEvent, render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { ProductThumb } from './ProductThumb';

describe('ProductThumb', () => {
  test('shows the store picture without sending a referrer', () => {
    const { container } = render(<ProductThumb src="https://img.test/a.jpg" />);
    const img = container.querySelector('img')!;
    expect(img).toHaveAttribute('src', 'https://img.test/a.jpg');
    expect(img).toHaveAttribute('referrerpolicy', 'no-referrer');
  });

  test.each(['', null, '/relative.jpg', 'javascript:alert(1)'])(
    'no picture for %j',
    (src) => {
      const { container } = render(<ProductThumb src={src} />);
      expect(container.querySelector('img')).toBeNull();
    },
  );

  test('a picture that fails to load falls back to the empty tile', () => {
    const { container } = render(
      <ProductThumb src="https://img.test/gone.jpg" />,
    );
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
  });
});
