import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import type { TaskInstance } from '@/domain/types';

import { TaskCard } from './ChildCards';
import { applyKey } from './Keypad';
import { Mascot } from './Mascot';
import { MathGate } from './MathGate';
import { PinEntry } from './PinEntry';
import { Toast } from './Toast';
import { StarRow } from './Stars';

const instance = (over: Partial<TaskInstance> = {}): TaskInstance => ({
  id: 'i1',
  taskId: 't1',
  childId: 'c1',
  periodKey: '2026-10-11',
  dueDate: '2026-10-11',
  title: 'Feed the dog',
  icon: 'paw',
  stars: 3,
  status: 'todo',
  completedAt: null,
  completedDate: null,
  decidedAt: null,
  parentNote: null,
  returned: false,
  ...over,
});

describe('Keypad helpers', () => {
  it('applies keys with a max length', () => {
    expect(applyKey('12', '3', 4)).toBe('123');
    expect(applyKey('1234', '5', 4)).toBe('1234');
    expect(applyKey('12', 'back', 4)).toBe('1');
    expect(applyKey('12', 'clear', 4)).toBe('');
  });
});

describe('PinEntry', () => {
  it('reports the PIN after 4 digits and resets', async () => {
    const onComplete = jest.fn();
    await render(<PinEntry title="Enter your PIN" onComplete={onComplete} />);
    for (const d of '2580') await fireEvent.press(screen.getByTestId(`key-${d}`));
    expect(onComplete).toHaveBeenCalledWith('2580');
    expect(screen.getByLabelText('0 of 4 digits entered')).toBeTruthy();
  });

  it('shows errors', async () => {
    await render(
      <PinEntry title="Enter your PIN" onComplete={jest.fn()} error="That PIN isn't right." />,
    );
    expect(screen.getByText("That PIN isn't right.")).toBeTruthy();
  });
});

describe('MathGate', () => {
  it('passes only with the right answer', async () => {
    const onPass = jest.fn();
    // random() = 0 → 12 × 3 = 36
    await render(<MathGate onPass={onPass} random={() => 0} />);
    expect(screen.getByText('12 × 3 = ?')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('key-3'));
    await fireEvent.press(screen.getByTestId('key-7'));
    await fireEvent.press(screen.getByTestId('math-submit'));
    expect(onPass).not.toHaveBeenCalled();
    expect(screen.getByText(/new question/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('key-3'));
    await fireEvent.press(screen.getByTestId('key-6'));
    await fireEvent.press(screen.getByTestId('math-submit'));
    expect(onPass).toHaveBeenCalledTimes(1);
  });

  it('asks several questions when rounds > 1', async () => {
    const onPass = jest.fn();
    await render(<MathGate onPass={onPass} rounds={2} random={() => 0} />);
    for (let r = 0; r < 2; r++) {
      await fireEvent.press(screen.getByTestId('key-3'));
      await fireEvent.press(screen.getByTestId('key-6'));
      await fireEvent.press(screen.getByTestId('math-submit'));
    }
    expect(onPass).toHaveBeenCalledTimes(1);
  });
});

describe('TaskCard', () => {
  it('is tappable with a spoken-friendly label and a separate speaker button', async () => {
    const onPress = jest.fn();
    const onSpeak = jest.fn();
    await render(<TaskCard instance={instance()} onPress={onPress} onSpeak={onSpeak} />);
    await fireEvent.press(screen.getByLabelText('Feed the dog. 3 stars. Tap to check it off.'));
    expect(onPress).toHaveBeenCalled();
    await fireEvent.press(screen.getByLabelText('Hear: Feed the dog'));
    expect(onSpeak).toHaveBeenCalled();
  });

  it('shows waiting and returned states', async () => {
    const { rerender } = await render(
      <TaskCard
        instance={instance({ status: 'waiting' })}
        onPress={jest.fn()}
        onSpeak={jest.fn()}
      />,
    );
    expect(screen.getByLabelText('Feed the dog. Waiting for a grown-up to check.')).toBeTruthy();
    await rerender(
      <TaskCard
        instance={instance({ returned: true, parentNote: 'Almost! Try once more.' })}
        onPress={jest.fn()}
        onSpeak={jest.fn()}
      />,
    );
    expect(screen.getByText('Almost! Try once more.')).toBeTruthy();
  });
});

describe('StarRow', () => {
  it('announces the count', async () => {
    await render(<StarRow count={7} />);
    expect(screen.getByLabelText('7 stars')).toBeTruthy();
    expect(screen.getByText('+2')).toBeTruthy();
  });
});

describe('screen reader support', () => {
  it('job cards offer a "Hear it" accessibility action', async () => {
    const onPress = jest.fn();
    const onSpeak = jest.fn();
    await render(<TaskCard instance={instance()} onPress={onPress} onSpeak={onSpeak} />);
    const card = screen.getByLabelText('Feed the dog. 3 stars. Tap to check it off.');
    expect(card.props.accessibilityActions).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'speak', label: 'Hear it' })]),
    );
    await fireEvent(card, 'accessibilityAction', { nativeEvent: { actionName: 'speak' } });
    expect(onSpeak).toHaveBeenCalled();
    expect(onPress).not.toHaveBeenCalled();
    await fireEvent(card, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
    expect(onPress).toHaveBeenCalled();
  });

  it('hides the decorative mascot from screen readers', async () => {
    await render(<Mascot animate={false} />);
    expect(screen.queryByLabelText(/Sparky/)).toBeNull();
  });

  it('announces toasts for VoiceOver', async () => {
    const spy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    await render(<Toast message="Great job! A grown-up will check it." onHide={jest.fn()} />);
    expect(spy).toHaveBeenCalledWith('Great job! A grown-up will check it.');
  });
});
