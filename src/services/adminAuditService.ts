/**
 * adminAuditService.ts
 * Enterprise audit logging service for administrative actions, authentication attempts,
 * sensitive data access, and settings modifications.
 * Persists records to Supabase 'admin_actions' and local storage backup.
 */

import { supabase } from './supabaseClient'

export type AuditActionType =
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILED'
  | 'AUTH_LOCKOUT_TRIGGERED'
  | 'AUTH_LOGOUT'
  | 'VIEW_SENSITIVE_RECORDS'
  | 'VIEW_CUSTOMER_ORDERS'
  | 'VIEW_USER_PROFILES'
  | 'VIEW_FINANCIAL_REPORTS'
  | 'CREATE_ARTICLE'
  | 'UPDATE_ARTICLE'
  | 'DELETE_ARTICLE'
  | 'SYNC_ARTICLES_TO_SUPABASE'
  | 'CREATE_PRODUCT'
  | 'UPDATE_PRODUCT'
  | 'DELETE_PRODUCT'
  | 'UPDATE_ORDER_STATUS'
  | 'UPDATE_USER_ROLE'
  | 'UPDATE_SITE_SETTINGS'
  | 'UPDATE_SECURITY_RULES'
  | 'BULK_APPROVE_SCANNED_POSTS'

export interface AdminAuditEvent {
  id?: string
  adminId?: string
  adminEmail: string
  adminRole?: string
  action: AuditActionType | string
  targetType: string
  targetId?: string
  details?: string
  previousValue?: string | Record<string, any>
  newValue?: string | Record<string, any>
  timestamp?: string
  ipAddress?: string
  userAgent?: string
}

const LOCAL_AUDIT_KEY = 'flz_admin_audit_events_v1'

export function getLocalAuditLogs(): AdminAuditEvent[] {
  try {
    const raw = localStorage.getItem(LOCAL_AUDIT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveLocalAuditLog(event: AdminAuditEvent): void {
  try {
    const current = getLocalAuditLogs()
    const updated = [event, ...current].slice(0, 500) // retain last 500 locally
    localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify(updated))
  } catch {}
}

export async function logAdminEvent(event: AdminAuditEvent): Promise<void> {
  const fullEvent: AdminAuditEvent = {
    ...event,
    id: event.id || `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: event.timestamp || new Date().toISOString(),
    adminRole: event.adminRole || 'admin',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'browser',
  }

  // 1. Save locally for instant availability
  saveLocalAuditLog(fullEvent)

  // 2. Persist to Supabase admin_actions table
  try {
    let detailsText = fullEvent.details || ''
    if (fullEvent.previousValue || fullEvent.newValue) {
      const diffPayload = {
        summary: fullEvent.details,
        before: fullEvent.previousValue,
        after: fullEvent.newValue,
      }
      detailsText = JSON.stringify(diffPayload)
    }

    await (supabase.from('admin_actions') as any).insert({
      admin_email: fullEvent.adminEmail,
      action: fullEvent.action,
      entity: fullEvent.targetType,
      entity_id: fullEvent.targetId || null,
      details: detailsText,
      created_at: fullEvent.timestamp,
    })
  } catch (err) {
    // Non-blocking fallback
    console.warn('[AuditLogger] Supabase audit log error:', err)
  }
}

export async function fetchAllAuditLogs(): Promise<AdminAuditEvent[]> {
  try {
    const { data, error } = await supabase
      .from('admin_actions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        adminEmail: row.admin_email || 'unknown',
        adminRole: 'admin',
        action: row.action || 'UNKNOWN_ACTION',
        targetType: row.entity || 'General',
        targetId: row.entity_id || undefined,
        details: row.details || undefined,
        timestamp: row.created_at || new Date().toISOString(),
      }))
    }
  } catch (e) {
    console.warn('[AuditLogger] Fetching Supabase audit logs failed, using local store:', e)
  }

  return getLocalAuditLogs()
}
