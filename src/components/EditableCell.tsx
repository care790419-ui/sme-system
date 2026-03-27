import React, { useState, useRef, useEffect, KeyboardEvent } from 'react'

export interface SelectOption {
  value: string
  label: string
}

interface Props {
  value: string | number
  onSave: (v: string) => void
  type?: 'text' | 'number' | 'date' | 'month' | 'select'
  options?: SelectOption[]
  className?: string
  displayValue?: React.ReactNode
}

const EditableCell: React.FC<Props> = ({
  value,
  onSave,
  type = 'text',
  options,
  className = '',
  displayValue,
}) => {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  const inputRef = useRef<HTMLInputElement>(null)
  const selectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      selectRef.current?.focus()
    }
  }, [editing])

  const commit = () => {
    setEditing(false)
    if (draft !== String(value)) onSave(draft)
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') {
      setDraft(String(value))
      setEditing(false)
    }
  }

  if (editing) {
    if (type === 'select' && options) {
      return (
        <select
          ref={selectRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          className="w-full border border-blue-400 rounded px-1.5 py-0.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {options.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )
    }
    return (
      <input
        ref={inputRef}
        type={type === 'number' ? 'number' : type === 'date' ? 'date' : type === 'month' ? 'month' : 'text'}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKey}
        className="w-full border border-blue-400 rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="點擊編輯"
      className={`cursor-pointer hover:bg-blue-50 hover:text-blue-700 rounded px-1 py-0.5 transition-colors inline-block min-w-[2rem] ${className}`}
    >
      {displayValue !== undefined
        ? displayValue
        : typeof value === 'number' && type === 'number'
        ? value.toLocaleString('zh-TW')
        : value}
    </span>
  )
}

export default EditableCell
