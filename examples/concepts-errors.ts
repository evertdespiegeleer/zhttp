import { z } from 'zod'
import { controller, get } from '@zhttp/core'
import { NotFoundError } from '@zhttp/errors'

// Let's presume we're talking to some sort of database
const db: any = undefined

export const vegetablesController = controller('vegetables')

vegetablesController.endpoint(
  get('/vegetables/:vegetableId', 'getVegetableDetails')
    .input(z.object({
      params: z.object({
        vegetableId: z.string().uuid()
      })
    }))
    .response(z.object({
      message: z.string()
    }))
    .handler(async ({ params: { vegetableId } }) => {
      const vegetableDetails = await db.getVegetableById(vegetableId)
      if (vegetableDetails == null) {
        // ✨✨✨✨✨✨✨✨✨
        throw new NotFoundError(`Vegetable with id ${vegetableId} does not exist`)
        // ⬆ This will result in a 404 response
        // ✨✨✨✨✨✨✨✨✨
      }
      return vegetableDetails
    })
)
