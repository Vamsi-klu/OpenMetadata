/*
 *  Copyright 2026 Collate.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HoverCard } from './hover-card';

const card = (props: Partial<Parameters<typeof HoverCard>[0]> = {}) => (
  <HoverCard content={<a href="/profile">Profile</a>} {...props}>
    <a href="/user">Jane</a>
  </HoverCard>
);

const renderCard = (props?: Partial<Parameters<typeof HoverCard>[0]>) =>
  render(card(props));

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe('HoverCard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Establish pointer modality so react-aria accepts hover events.
    fireEvent.mouseMove(document);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens immediately when defaultOpen is set and does not report the initial state', () => {
    const onOpenChange = vi.fn();
    renderCard({ defaultOpen: true, onOpenChange });

    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('keeps an initially open card hidden while disabled', () => {
    const onOpenChange = vi.fn();
    const { rerender } = renderCard({
      defaultOpen: true,
      isDisabled: true,
      onOpenChange,
    });

    expect(screen.queryByText('Profile')).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    rerender(card({ defaultOpen: true, onOpenChange }));

    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('closes an initially open card on Escape and reports the dismissal', () => {
    const onOpenChange = vi.fn();
    renderCard({ defaultOpen: true, onOpenChange });

    expect(screen.getByText('Profile')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('cancels a pending hover timer when Escape dismisses the card from within', () => {
    const onOpenChange = vi.fn();
    renderCard({ defaultOpen: true, onOpenChange });
    const profile = screen.getByText('Profile');

    fireEvent.mouseEnter(profile.parentElement as HTMLElement, {
      pointerType: 'mouse',
    });
    fireEvent.keyDown(profile, { key: 'Escape' });
    advance(300);

    expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('reports transitions after the hover timers with the latest callback', () => {
    const onOpenChange = vi.fn();
    const latestOnOpenChange = vi.fn();
    const { rerender } = renderCard({ onOpenChange });
    const trigger = screen.getByText('Jane').parentElement as HTMLElement;

    fireEvent.mouseEnter(trigger, { pointerType: 'mouse' });
    rerender(card({ onOpenChange: latestOnOpenChange }));
    advance(300);

    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(latestOnOpenChange).toHaveBeenNthCalledWith(1, true);

    fireEvent.mouseLeave(trigger, { pointerType: 'mouse' });
    advance(200);

    expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    expect(latestOnOpenChange).toHaveBeenNthCalledWith(2, false);
    expect(latestOnOpenChange).toHaveBeenCalledTimes(2);
  });

  it('reports only the close when a hover timer repeats the initial open state', () => {
    const onOpenChange = vi.fn();
    renderCard({ defaultOpen: true, onOpenChange });
    const trigger = screen.getByText('Jane').parentElement as HTMLElement;

    fireEvent.mouseEnter(trigger, { pointerType: 'mouse' });
    advance(300);

    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();

    fireEvent.mouseLeave(trigger, { pointerType: 'mouse' });
    advance(200);

    expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('opens after openDelay on hover and stays open while the pointer is in the card', () => {
    renderCard();
    const trigger = screen.getByText('Jane').parentElement as HTMLElement;

    fireEvent.mouseEnter(trigger, { pointerType: 'mouse' });
    advance(299);

    expect(screen.queryByText('Profile')).toBeNull();

    advance(1);

    expect(screen.getByText('Profile')).toBeInTheDocument();

    fireEvent.mouseLeave(trigger, { pointerType: 'mouse' });
    fireEvent.mouseEnter(
      screen.getByText('Profile').parentElement as HTMLElement,
      {
        pointerType: 'mouse',
      }
    );
    advance(500);

    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('closes after closeDelay when the pointer leaves', () => {
    renderCard({ openDelay: 0, closeDelay: 200 });
    const trigger = screen.getByText('Jane').parentElement as HTMLElement;

    fireEvent.mouseEnter(trigger, { pointerType: 'mouse' });
    advance(0);
    fireEvent.mouseLeave(trigger, { pointerType: 'mouse' });
    advance(199);

    expect(screen.getByText('Profile')).toBeInTheDocument();

    advance(1);

    expect(screen.queryByText('Profile')).toBeNull();
  });

  it('opens on keyboard focus and closes on Escape', () => {
    renderCard({ openDelay: 0 });

    fireEvent.keyDown(document.body, { key: 'Tab' });
    act(() => screen.getByText('Jane').focus());
    advance(0);

    expect(screen.getByText('Profile')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByText('Profile')).toBeNull();
  });

  it('stays open while keyboard focus moves from the trigger into the card', () => {
    renderCard({ openDelay: 0, closeDelay: 200 });

    fireEvent.keyDown(document.body, { key: 'Tab' });
    act(() => screen.getByText('Jane').focus());
    advance(0);

    act(() => screen.getByText('Profile').focus());
    advance(500);

    expect(screen.getByText('Profile')).toBeInTheDocument();

    act(() => screen.getByText('Profile').blur());
    advance(500);

    expect(screen.queryByText('Profile')).toBeNull();
  });

  it('never opens when disabled', () => {
    renderCard({ isDisabled: true, openDelay: 0 });

    fireEvent.mouseEnter(
      screen.getByText('Jane').parentElement as HTMLElement,
      {
        pointerType: 'mouse',
      }
    );
    advance(1000);

    expect(screen.queryByText('Profile')).toBeNull();
  });

  it('renders an arrow toward the trigger only when arrow is set', () => {
    const open = (arrow: boolean) => {
      const { unmount } = renderCard({ openDelay: 0, arrow });
      fireEvent.mouseEnter(
        screen.getByText('Jane').parentElement as HTMLElement,
        { pointerType: 'mouse' }
      );
      advance(0);
      const hasArrow = !!document.querySelector('[data-placement] svg');
      unmount();

      return hasArrow;
    };

    expect(open(false)).toBe(false);
    expect(open(true)).toBe(true);
  });

  it('places the card offset px away from the trigger', () => {
    const openLeft = (offset?: number) => {
      const { unmount } = renderCard({
        openDelay: 0,
        placement: 'right',
        offset,
      });
      fireEvent.mouseEnter(
        screen.getByText('Jane').parentElement as HTMLElement,
        { pointerType: 'mouse' }
      );
      advance(0);
      const left = (
        screen.getByText('Profile').closest('[data-placement]') as HTMLElement
      ).style.left;
      unmount();

      return left;
    };

    expect(openLeft()).toBe('8px');
    expect(openLeft(28)).toBe('28px');
  });
});
