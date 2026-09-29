'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { getTicketUserMe } from '@/lib/api/tickets'
import type { TicketAction, TicketRole, UserInfoResponse } from '@/lib/api/ticketTypes'
import {
  canTicketAction,
  defaultActionsForRole,
  resolveTicketRole,
  ticketActionsFromAuthUser
} from '@/lib/ticketAccess'

type TicketAccessState = {
  loading: boolean
  role: TicketRole
  actions: Set<string>
  objectScope: string[]
  me: UserInfoResponse | null
  error: string | null
  can: (action: TicketAction) => boolean
  refresh: () => Promise<void>
}

export function useTicketAccess(): TicketAccessState {
  const { user } = useAuth()
  const fallbackRole = resolveTicketRole(user)
  const fallbackActions = useMemo(() => ticketActionsFromAuthUser(user), [user])

  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<UserInfoResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actions, setActions] = useState<Set<string>>(fallbackActions)
  const [role, setRole] = useState<TicketRole>(fallbackRole)

  const refresh = useCallback(async () => {
    if (!user) {
      setMe(null)
      setActions(new Set())
      setRole('OBSERVER')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const info = await getTicketUserMe()
      setMe(info)
      const roles = info.roles?.length ? info.roles : info.user?.role ? [info.user.role] : []
      const resolved =
        roles.includes('ADMIN')
          ? 'ADMIN'
          : roles.includes('MANAGER')
            ? 'MANAGER'
            : roles.includes('ENGINEER')
              ? 'ENGINEER'
              : roles.includes('OBSERVER')
                ? 'OBSERVER'
                : fallbackRole
      setRole(resolved)
      if (info.allowed_actions?.length) {
        if (info.allowed_actions.includes('*')) {
          setActions(defaultActionsForRole('ADMIN'))
        } else {
          setActions(new Set(info.allowed_actions))
        }
      } else {
        setActions(ticketActionsFromAuthUser(user))
      }
    } catch (err) {
      // Ticket Service / ключ могут быть недоступны — работаем по ролям auth
      setMe(null)
      setRole(fallbackRole)
      setActions(fallbackActions)
      setError(err instanceof Error ? err.message : 'Модуль заявок недоступен')
    } finally {
      setLoading(false)
    }
  }, [user, fallbackRole, fallbackActions])

  useEffect(() => {
    refresh()
  }, [refresh])

  const can = useCallback(
    (action: TicketAction) => canTicketAction(actions, action, role),
    [actions, role]
  )

  return {
    loading,
    role,
    actions,
    objectScope: me?.object_scope || [],
    me,
    error,
    can,
    refresh
  }
}
