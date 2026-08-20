import { useApp } from '../context/AppContext'
import { Link } from 'react-router-dom'

interface Props {
  open: boolean
  onClose: () => void
}

export default function CartDrawer({ open, onClose }: Props) {
  const { cart, removeFromCart, updateQty, cartTotal, t } = useApp()

  if (!open) return null

  const freeShippingThreshold = 80
  const progressToFreeShipping = Math.min(100, (cartTotal / freeShippingThreshold) * 100)
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - cartTotal)

  return (
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div
        className="absolute right-0 top-0 bottom-0 w-full max-w-sm flex flex-col shadow-2xl transition-transform duration-300"
        style={{ background: '#0f0f1c', borderLeft: '1px solid #1e1e32', paddingBottom: '70px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e32]">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>
              Shopping Cart
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#00b341' }}>
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1 text-lg">
            ✕
          </button>
        </div>

        {/* Free Shipping Progress Bar */}
        {cart.length > 0 && (
          <div className="px-5 py-3 border-b border-[#1e1e32] bg-[#131320]">
            <div className="flex justify-between text-[11px] font-semibold mb-1.5">
              <span className="text-gray-300">
                {remainingForFreeShipping === 0 ? (
                  <span className="text-[#00b341] font-bold">🎉 You qualify for FREE Shipping!</span>
                ) : (
                  <>Add <strong className="text-white">{formatPrice(remainingForFreeShipping)}</strong> for FREE Shipping</>
                )}
              </span>
            </div>
            <div className="h-1.5 w-full bg-[#1e1e32] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressToFreeShipping}%`, background: '#00b341' }}
              />
            </div>
          </div>
        )}

        {/* Item List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <div className="text-6xl mb-3">🛒</div>
              <p className="text-sm font-semibold text-gray-400 mb-4">{t('cartEmpty')}</p>
              <Link
                to="/shop"
                onClick={onClose}
                className="inline-block px-5 py-2.5 text-xs font-bold text-white rounded-xl transition-all hover:opacity-90"
                style={{ background: '#00b341' }}
              >
                {t('browseShop')} →
              </Link>
            </div>
          ) : (
            cart.map(item => (
              <div key={`${item.id}-${item.size}`} className="flex gap-3 py-3 border-b border-[#1e1e32]">
                <img src={item.image} alt={item.name} className="w-16 h-16 object-contain bg-[#0c0c14] rounded-xl shrink-0 p-1 border border-[#1e1e32]" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{item.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Size: <strong className="text-white">{item.size}</strong></p>
                  <p className="text-sm font-black text-[#00b341] mt-1" style={{ fontFamily: 'Big Shoulders Display' }}>
                    {formatPrice(item.price * item.quantity)}
                  </p>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.id, item.size, item.quantity - 1)}
                        className="w-6 h-6 rounded-lg border border-[#1e1e32] text-white text-xs font-bold flex items-center justify-center hover:bg-white/10"
                        style={{ background: '#131320' }}
                      >
                        −
                      </button>
                      <span className="text-xs font-bold text-white w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.id, item.size, item.quantity + 1)}
                        className="w-6 h-6 rounded-lg border border-[#1e1e32] text-white text-xs font-bold flex items-center justify-center hover:bg-white/10"
                        style={{ background: '#131320' }}
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.id, item.size)}
                      className="text-[10px] text-gray-500 hover:text-red-400 font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer / Checkout Button */}
        {cart.length > 0 && (
          <div className="px-5 py-4 border-t border-[#1e1e32] bg-[#0c0c14]">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-gray-400">Subtotal</span>
              <span className="text-xl font-black text-[#00b341]" style={{ fontFamily: 'Big Shoulders Display' }}>
                {formatPrice(cartTotal)}
              </span>
            </div>
            <Link
              to="/checkout"
              onClick={onClose}
              className="block w-full text-center py-3.5 rounded-xl font-black text-sm text-white transition-all hover:opacity-90 shadow-xl"
              style={{ background: '#00b341', fontFamily: 'Big Shoulders Display', fontSize: '17px' }}
            >
              Proceed to Checkout →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
