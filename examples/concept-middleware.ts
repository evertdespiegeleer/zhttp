import { type Request, type Response, type NextFunction } from 'express';
import { middleware, MiddlewareTypes } from '@zhttp/core'

export const lastVisitMiddleware = middleware({
    name: 'lastVisitMiddleware',
    type: MiddlewareTypes.BEFORE,
    handler(req: Request, res: Response, next: NextFunction) {
        const now = new Date()
        const lastVisitCookieValue = req.cookies['beenHereBefore']
        const lastVisitTime = lastVisitCookieValue ? new Date(lastVisitCookieValue) : undefined
        res.cookie('beenHereBefore', now.toISOString)
        if (lastVisitTime == null) {
            console.log('Seems like we\'ve got a new user 👀')
            return next();
        }
        const daysSinceLastVisit = (now.getTime() - lastVisitTime.getTime()) / (1000 * 60 * 60 * 24)
        console.log(`It's been ${daysSinceLastVisit} days since this user last visited.`)
        return next();
    }
})