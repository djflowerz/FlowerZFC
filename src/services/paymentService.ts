// Official Paystack Integration Service
// Uses Paystack Inline Popup SDK (https://js.paystack.co/v1/inline.js)
// Public key & callback URL are retrieved from import.meta.env (VITE_PAYMENT_PUBLIC_KEY)
//
// SECURITY: This file must never log payment data to the console.
//           Keys are read from env vars only — never hardcoded or returned to UI components.

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string
        email: string
        amount: number // in smallest currency unit (e.g. cents/kobo)
        ref: string
        currency?: string
        channels?: string[]
        metadata?: Record<string, unknown>
        callback: (response: { reference: string; status: string; trans: string }) => void
        onClose: () => void
      }) => {
        openIframe: () => void
      }
    }
  }
}

export interface PaymentPayload {
  amount: number
  email: string
  phone?: string
  currency?: string
  method: 'mpesa' | 'card' | 'paypal'
  reference: string
  metadata?: Record<string, unknown>
}

export interface PaymentResponse {
  success: boolean
  reference: string
  transactionId?: string
  message: string
  redirectUrl?: string
}

// Keys read from environment only — never referenced directly in components
const PUBLIC_KEY = import.meta.env.VITE_PAYMENT_PUBLIC_KEY || ''
const CALLBACK_URL = import.meta.env.VITE_PAYMENT_CALLBACK_URL || 'https://www.djflowerz.co.ke/success'

export function initiatePaystackPopup(
  payload: PaymentPayload,
  onSuccess: (ref: string) => void,
  onClose?: () => void
) {
  const currency = payload.currency || 'KES'
  const amountInSmallestUnit = Math.round(payload.amount * 100)

  const openPopup = () => {
    if (typeof window === 'undefined' || !window.PaystackPop) {
      if (onClose) onClose()
      return
    }

    try {
      const handler = window.PaystackPop.setup({
        key: PUBLIC_KEY,
        email: payload.email || 'customer@flowerz.fc',
        amount: amountInSmallestUnit,
        currency: currency,
        ref: payload.reference,
        channels: payload.method === 'mpesa' ? ['mobile_money', 'card'] : ['card', 'mobile_money', 'bank'],
        metadata: {
          custom_fields: [
            { display_name: 'Payment Method', variable_name: 'payment_method', value: payload.method },
            { display_name: 'Customer Phone', variable_name: 'customer_phone', value: payload.phone || '' },
          ],
          ...payload.metadata,
        },
        callback: (response) => {
          onSuccess(response.reference)
        },
        onClose: () => {
          if (onClose) onClose()
        },
      })

      handler.openIframe()
    } catch (e) {
      console.error('Paystack popup error:', e)
      if (onClose) onClose()
    }
  }

  if (typeof window !== 'undefined' && window.PaystackPop) {
    openPopup()
  } else {
    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.async = true
    script.onload = () => openPopup()
    script.onerror = () => {
      console.error('Failed to load Paystack inline JS SDK')
      if (onClose) onClose()
    }
    document.head.appendChild(script)
  }
}


export async function initiatePayment(payload: PaymentPayload): Promise<PaymentResponse> {
  return new Promise((resolve) => {
    initiatePaystackPopup(
      payload,
      (ref) => {
        resolve({
          success: true,
          reference: ref,
          transactionId: `PAYSTACK-${ref}`,
          message: 'Payment authorized.',
          redirectUrl: CALLBACK_URL,
        })
      },
      () => {
        resolve({
          success: false,
          reference: payload.reference,
          message: 'Payment closed.',
        })
      }
    )
  })
}

/**
 * Returns only non-sensitive connection status for UI use.
 * Never includes key material, prefixes, or partial secrets.
 */
export function getPaymentConfig() {
  return {
    provider: 'Paystack' as const,
    isLive: PUBLIC_KEY.startsWith('pk_live_'),
    hasPublicKey: Boolean(PUBLIC_KEY),
    callbackUrl: CALLBACK_URL,
  }
}
