'use client';

import { KeyboardEvent, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

interface SelectGroup {
  label: string;
  options: string[];
}

interface DownwardSelectProps {
  id: string;
  label: string;
  value: string;
  groups: SelectGroup[];
  onValueChange: (value: string) => void;
}

// This popup is anchored below its trigger. The viewport only limits its height.
export default function DownwardSelect({ id, label, value, groups, onValueChange }: DownwardSelectProps) {
  const listId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const search = useRef({ text: '', time: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: 320 });
  const options = ['', ...groups.flatMap(group => group.options)];

  const optionId = (index: number) => `${listId}-option-${index}`;
  const openMenu = (fallback = 0) => {
    const rect = trigger.current?.getBoundingClientRect();
    if (rect && window.innerHeight - rect.bottom < 180) {
      trigger.current?.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
    setActive(value ? Math.max(0, options.indexOf(value)) : fallback);
    search.current = { text: '', time: 0 };
    setOpen(true);
  };

  useLayoutEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(Math.max(rect.width, 280), window.innerWidth - 16);
      setPosition({
        top: rect.bottom + 6,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        width,
        maxHeight: Math.max(64, Math.min(320, window.innerHeight - rect.bottom - 14)),
      });
    };
    const onScroll = (event: Event) => {
      if (event.target instanceof Node && menu.current?.contains(event.target)) return;
      updatePosition();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !menu.current?.contains(event.target) && !trigger.current?.contains(event.target)) setOpen(false);
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', onScroll, true);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const option = document.getElementById(optionId(active));
    if (option && menu.current) {
      // Scroll the options only, never move the page to follow the active item.
      const offset = option.getBoundingClientRect().top - menu.current.getBoundingClientRect().top;
      if (offset < 0) menu.current.scrollTop += offset;
      else if (offset + option.offsetHeight > menu.current.clientHeight) {
        menu.current.scrollTop += offset + option.offsetHeight - menu.current.clientHeight;
      }
    }
  }, [active, open, listId, position.maxHeight]);

  const choose = (index: number) => {
    onValueChange(options[index]);
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Tab') { setOpen(false); return; }
    if (event.key === 'Escape') {
      if (open) { event.preventDefault(); event.stopPropagation(); setOpen(false); }
      return;
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      if (!open) { openMenu(event.key === 'ArrowUp' || event.key === 'End' ? options.length - 1 : 0); return; }
      if (event.key === 'Enter' || event.key === ' ') { choose(active); return; }
      setActive(index => event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
        : Math.max(0, Math.min(options.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
      event.preventDefault();
      if (!open) openMenu();
      const now = Date.now();
      const text = (now - search.current.time < 700 ? search.current.text : '') + event.key;
      search.current = { text, time: now };
      const normalize = (term: string) => term.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const match = options.findIndex(option => normalize(option).startsWith(normalize(text)));
      if (match >= 0) setActive(match);
    }
  };

  const renderOption = (option: string) => {
    const index = options.indexOf(option);
    return (
      <div key={option} id={optionId(index)} role="option" aria-selected={value === option}
        onPointerMove={event => { if (event.pointerType === 'mouse') setActive(index); }}
        onMouseDown={event => event.preventDefault()}
        onClick={() => choose(index)}
        className={`flex cursor-pointer items-center justify-between gap-2 px-4 py-2 text-sm ${
          active === index ? 'bg-purple-500/25 text-white' : 'text-[#eaf0ff] hover:bg-purple-500/15'
        }`}
      >
        <span>{option || '— Selecione —'}</span>
        {value === option && <Check className="h-4 w-4 shrink-0 text-[#7ef2bf]" aria-hidden="true" />}
      </div>
    );
  };

  return (
    <>
      <button ref={trigger} id={id} type="button" role="combobox" aria-label={label}
        aria-haspopup="listbox" aria-controls={open ? listId : undefined} aria-expanded={open}
        aria-activedescendant={open ? optionId(active) : undefined}
        onClick={() => open ? setOpen(false) : openMenu()}
        onKeyDown={onKeyDown} onBlur={() => setOpen(false)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-[#2a3d5c] bg-[#0f1a2b] py-3 pl-4 pr-3 text-left text-[#eaf0ff] outline-none transition-all focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
      >
        <span className="truncate">{value || '— Selecione —'}</span>
        <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
      </button>
      {open && createPortal(
        <div ref={menu} id={listId} role="listbox" aria-label={label}
          className="fixed z-[1000] overflow-y-auto overscroll-contain rounded-lg border border-[#314566] bg-[#0f1a2b] py-1 shadow-2xl"
          style={position}
        >
          {renderOption('')}
          {groups.map((group, index) => (
            <div key={group.label} role="group" aria-labelledby={`${listId}-group-${index}`}>
              <div id={`${listId}-group-${index}`} className="px-4 pb-1 pt-3 text-xs font-extrabold text-[#9fb0cf]">{group.label}</div>
              {group.options.map(renderOption)}
            </div>
          ))}
        </div>, document.body,
      )}
    </>
  );
}
