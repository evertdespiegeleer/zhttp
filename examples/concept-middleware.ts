import { MiddlewareTypes, middleware } from '@zhttp/core'
import type { NextFunction, Request, Response } from 'express'

export const lastVisitMiddleware = middleware({
  name: 'lastVisitMiddleware',
  type: MiddlewareTypes.BEFORE,
  handler(req: Request, res: Response, next: NextFunction) {
    const now = new Date()
    const lastVisitCookieValue = req.cookies.beenHereBefore
    const lastVisitTime = lastVisitCookieValue != null ? new Date(String(lastVisitCookieValue)) : undefined
    res.cookie('beenHereBefore', now.toISOString())
    if (lastVisitTime == null) {
      console.log("Seems like we've got a new user 👀")
      next()
      return
    }
    const daysSinceLastVisit = (now.getTime() - lastVisitTime.getTime()) / (1000 * 60 * 60 * 24)
    console.log(`It's been ${daysSinceLastVisit} days since this user last visited.`)
    next()
  }
})
