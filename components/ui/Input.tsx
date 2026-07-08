'use client'
import { InputHTMLAttributes } from 'react'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1px solid #DCE1E6',
  borderRadius: 9, fontSize: 14, color: '#26303B', background: '#fff',
  transition: 'border-color 0.15s',
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{ ...inputStyle, ...props.style }}
      onFocus={e => { e.currentTarget.style.borderColor = '#5BCBF5'; props.onFocus?.(e) }}
      onBlur={e => { e.currentTarget.style.borderColor = '#DCE1E6'; props.onBlur?.(e) }}
    />
  )
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{
        width: '100%', padding: '10px 12px', border: '1px solid #DCE1E6',
        borderRadius: 9, fontSize: 14, color: '#26303B', background: '#fff',
        resize: 'vertical', lineHeight: 1.5, minHeight: 64,
        transition: 'border-color 0.15s', ...props.style,
      }}
      onFocus={e => { e.currentTarget.style.borderColor = '#5BCBF5'; props.onFocus?.(e) }}
      onBlur={e => { e.currentTarget.style.borderColor = '#DCE1E6'; props.onBlur?.(e) }}
    />
  )
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#5F6B76', marginBottom: 5, letterSpacing: '.02em' }}>
      {children}
    </label>
  )
}
