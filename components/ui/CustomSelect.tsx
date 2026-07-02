'use client'

import { useState, useRef, useEffect } from 'react'

interface Option {
  value: string
  label: string
}

interface CustomSelectProps {
  value:       string
  onChange:    (value: string) => void
  options:     Option[]
  placeholder?: string
  disabled?:   boolean
  style?:      React.CSSProperties
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Choisir…',
  disabled = false,
  style,
}: CustomSelectProps) {
  const [open, setOpen]   = useState(false)
  const ref               = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        userSelect: 'none',
        ...style,
      }}
    >
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        style={{
          width:           '100%',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'space-between',
          gap:             8,
          padding:         '10px var(--s-4)',
          background:      'var(--surface-2)',
          border:          `1px solid ${open ? 'var(--lavender)' : 'var(--border-1)'}`,
          borderRadius:    'var(--r-lg)',
          color:           selected ? 'var(--text-1)' : 'var(--text-3)',
          fontSize:        '0.875rem',
          cursor:          disabled ? 'not-allowed' : 'pointer',
          opacity:         disabled ? 0.5 : 1,
          transition:      'all 0.15s var(--ease)',
          fontFamily:      'var(--font)',
          boxShadow:       open ? '0 0 0 3px var(--lavender-light)' : 'none',
          backdropFilter:  'blur(8px)',
          textAlign:       'left',
          whiteSpace:      'nowrap',
          overflow:        'hidden',
          textOverflow:    'ellipsis',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selected ? selected.label : placeholder}
        </span>
        <i
          className="fas fa-chevron-down"
          style={{
            fontSize:   '0.65rem',
            color:      'var(--text-3)',
            transition: 'transform 0.2s var(--ease)',
            transform:  open ? 'rotate(180deg)' : 'rotate(0deg)',
            flexShrink: 0,
          }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position:        'absolute',
            top:             'calc(100% + 6px)',
            left:            0,
            minWidth: '100%',
            width: 'max-content',
            zIndex:          300,
            background:      'var(--bg-elevated, #16161E)',
            border:          '1px solid var(--border-1)',
            borderRadius:    'var(--r-xl)',
            boxShadow:       'var(--shadow-xl)',
            overflow:        'hidden',
            animation:       'fadeUp 0.15s var(--ease-out)',
            backdropFilter:  'blur(16px)',
          }}
        >
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false) }}
              style={{
                width:      '100%',
                display:    'flex',
                alignItems: 'center',
                gap:        8,
                padding:    '10px var(--s-4)',
                background: opt.value === value ? 'var(--surface-2)' : 'transparent',
                border:     'none',
                color:      opt.value === value ? 'var(--peach)' : 'var(--text-1)',
                fontSize:   '0.875rem',
                fontWeight: opt.value === value ? 600 : 400,
                cursor:     'pointer',
                textAlign:  'left',
                fontFamily: 'var(--font)',
                transition: 'background 0.1s var(--ease)',
              }}
              onMouseEnter={e => {
                if (opt.value !== value)
                  (e.target as HTMLButtonElement).style.background = 'var(--surface-2)'
              }}
              onMouseLeave={e => {
                if (opt.value !== value)
                  (e.target as HTMLButtonElement).style.background = 'transparent'
              }}
            >
              {opt.value === value && (
                <i className="fas fa-check" style={{ fontSize: '0.7rem', color: 'var(--peach)', flexShrink: 0 }} />
              )}
              {opt.value !== value && <span style={{ width: 14, flexShrink: 0 }} />}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}