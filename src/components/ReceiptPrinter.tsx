import { useEffect, useState } from 'react'
import { motion } from 'motion/react'

interface ReceiptItem {
  name: string
  qty: number
  price: number
}

interface ReceiptPrinterProps {
  orderNum: string
  items: ReceiptItem[]
  subtotal: number
  shipping?: number
  tip?: number
  total: number
  currency?: string
  date?: string
}

export default function ReceiptPrinter({
  orderNum,
  items,
  subtotal,
  shipping = 0,
  tip = 0,
  total,
  currency = 'KES',
  date,
}: ReceiptPrinterProps) {
  const [printed, setPrinted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setPrinted(true), 150)
    return () => clearTimeout(t)
  }, [])

  const fmt = (n: number) => `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  const dateStr = date || new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const lineCount = items.length
  const receiptHeight = 210 + lineCount * 22

  return (
    <div className="flex flex-col items-center py-2">
      <div className="relative" style={{ width: '260px' }}>
        <div
          className="rounded-t-xl relative z-20"
          style={{ height: '28px', background: 'linear-gradient(180deg, #2a2a3a 0%, #1a1a26 100%)', border: '1px solid #33334a' }}
        >
          <div
            className="absolute left-1/2 -translate-x-1/2 top-0"
            style={{ width: '180px', height: '10px', background: '#0a0a12', borderRadius: '0 0 4px 4px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)' }}
          />
        </div>

        <div
          className="relative z-10"
          style={{ height: '8px', background: '#0a0a12', borderLeft: '1px solid #33334a', borderRight: '1px solid #33334a' }}
        />

        <div className="relative overflow-hidden" style={{ height: printed ? `${receiptHeight}px` : '0px', transition: 'none' }}>
          <motion.div
            initial={{ y: -receiptHeight }}
            animate={printed ? { y: 0 } : { y: -receiptHeight }}
            transition={{ duration: 1.1, ease: [0.22, 0.61, 0.36, 1] }}
            className="absolute left-1/2 -translate-x-1/2"
            style={{ width: '236px', top: 0 }}
          >
            <div
              style={{
                background: '#fafaf7',
                color: '#1a1a1a',
                fontFamily: "'Courier New', monospace",
                fontSize: '11px',
                lineHeight: 1.5,
                padding: '18px 16px 22px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
              }}
            >
              <div className="text-center mb-2">
                <p style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '0.5px' }}>FLOWERZFC</p>
                <p style={{ fontSize: '9px', color: '#555' }}>Global Football Media Platform</p>
                <p style={{ fontSize: '9px', color: '#555' }}>djflowerz.co.ke</p>
              </div>

              <div style={{ borderTop: '1px dashed #999', margin: '8px 0' }} />

              <div className="flex justify-between" style={{ fontSize: '10px' }}>
                <span>Order #{orderNum}</span>
              </div>
              <div className="flex justify-between" style={{ fontSize: '10px', color: '#555' }}>
                <span>{dateStr}</span>
              </div>

              <div style={{ borderTop: '1px dashed #999', margin: '8px 0' }} />

              {items.map((item, i) => (
                <div key={i} className="flex justify-between" style={{ marginBottom: '4px' }}>
                  <span style={{ maxWidth: '150px' }}>
                    {item.qty}x {item.name.length > 22 ? item.name.slice(0, 22) + '…' : item.name}
                  </span>
                  <span>{fmt(item.price * item.qty)}</span>
                </div>
              ))}

              <div style={{ borderTop: '1px dashed #999', margin: '8px 0' }} />

              <div className="flex justify-between" style={{ fontSize: '10px' }}>
                <span>Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              {shipping > 0 && (
                <div className="flex justify-between" style={{ fontSize: '10px' }}>
                  <span>Shipping</span>
                  <span>{fmt(shipping)}</span>
                </div>
              )}
              {tip > 0 && (
                <div className="flex justify-between" style={{ fontSize: '10px' }}>
                  <span>Tip</span>
                  <span>{fmt(tip)}</span>
                </div>
              )}

              <div style={{ borderTop: '1px dashed #999', margin: '8px 0' }} />

              <div className="flex justify-between" style={{ fontWeight: 700, fontSize: '13px' }}>
                <span>TOTAL</span>
                <span>{fmt(total)}</span>
              </div>

              <div className="text-center" style={{ marginTop: '14px', fontSize: '9px', color: '#555' }}>
                <p>Thank you for your order</p>
                <p style={{ marginTop: '2px' }}>*  *  *</p>
              </div>
            </div>

            <svg width="236" height="12" viewBox="0 0 236 12" style={{ display: 'block' }}>
              <path
                d="M0,0 L0,6 L8,0 L16,6 L24,0 L32,6 L40,0 L48,6 L56,0 L64,6 L72,0 L80,6 L88,0 L96,6 L104,0 L112,6 L120,0 L128,6 L136,0 L144,6 L152,0 L160,6 L168,0 L176,6 L184,0 L192,6 L200,0 L208,6 L216,0 L224,6 L232,0 L236,3 L236,0 Z"
                fill="#fafaf7"
              />
            </svg>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
