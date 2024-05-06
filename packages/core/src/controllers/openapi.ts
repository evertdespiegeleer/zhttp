import { controller } from '../util/controller.js'
import { get } from '../util/endpoint.js'
import { oasInstance } from '../app.js'

export const openapiController = controller('OpenAPI')
  .description('Exposes an OpenAPI spec and Rapidoc page')
  .endpoints([
    get('/openapi.json', 'getOpenAPISpec')
      .responseContentType('application/json')
      .handler(async () => {
        return oasInstance.getJsonSpec()
      }),

    get('/api.html', 'API usage')
      .responseContentType('text/html')
      .handler(
        async () => `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <script
            type="module"
            src="https://unpkg.com/rapidoc/dist/rapidoc-min.js"
          ></script>
        </head>
        <body>
          <rapi-doc
            spec-url="./openapi.json"
            server-url="./"
            default-api-server="./"
            allow-server-selection="false"
            theme="dark"
            render-style="view"
            fill-request-fields-with-example="false"
            persist-auth="true"
          />
        </body>
      </html>
    `
      )
  ])
