import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { useSubmitGuard } from '@/hooks/useSubmitGuard';

import { ErrorText } from './ErrorText';
import { Field, Stepper, ToggleRow } from './Form';

describe('parent form accessibility', () => {
  it('Field validates on blur and announces the error', async () => {
    const spy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    await render(
      <Field
        label="Job name"
        value=""
        onChangeText={jest.fn()}
        error="Give the task a short name."
      />,
    );
    expect(screen.queryByText('Give the task a short name.')).toBeNull();
    await fireEvent(screen.getByLabelText('Job name'), 'blur');
    expect(screen.getByText('Give the task a short name.')).toBeTruthy();
    expect(spy).toHaveBeenCalledWith('Give the task a short name.');
    expect(screen.getByLabelText('Job name').props.accessibilityHint).toBe(
      'Give the task a short name.',
    );
  });

  it('Field shows errors immediately after a submit attempt', async () => {
    await render(<Field label="Name" value="" error="Please enter a name." showError />);
    expect(screen.getByText('Please enter a name.')).toBeTruthy();
  });

  it('ToggleRow: the whole row is one switch target', async () => {
    const onChange = jest.fn();
    await render(
      <ToggleRow
        label="Read aloud"
        description="Speaks job names"
        value={false}
        onChange={onChange}
      />,
    );
    const row = screen.getByRole('switch', { name: 'Read aloud' });
    expect(row.props.accessibilityState).toMatchObject({ checked: false });
    await fireEvent.press(row);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('Stepper buttons say which value they change', async () => {
    const onChange = jest.fn();
    await render(<Stepper label="Cost in stars" value={5} min={1} max={10} onChange={onChange} />);
    await fireEvent.press(screen.getByLabelText('Cost in stars: plus 1'));
    expect(onChange).toHaveBeenCalledWith(6);
  });

  it('ErrorText is an alert', async () => {
    await render(<ErrorText>Something went wrong.</ErrorText>);
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});

describe('useSubmitGuard', () => {
  it('ignores a second submit while the first is running', async () => {
    const { result } = await renderHook(() => useSubmitGuard());
    let resolve: () => void = () => undefined;
    const work = jest.fn(() => new Promise<void>((r) => (resolve = r)));
    let first: Promise<unknown> | undefined;
    await act(async () => {
      first = result.current.run(work);
      void result.current.run(work);
    });
    expect(work).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolve();
      await first;
    });
    await act(async () => {
      void result.current.run(async () => undefined);
    });
    expect(work).toHaveBeenCalledTimes(1);
  });
});
