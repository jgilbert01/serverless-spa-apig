# serverless-spa-apig

Serverless plugin to configure S3, API Gateway and Route53 for a SPA or JAMStack site.

* Creates S3 Website bucket
* Creates API Gateway _(unless disabled:true)_
* Creates Route 53 RecordSet _(unless disabled:true or hostedZoneId:undefined or endpoint:undefined)_

> This plugin is designed to work in conjunction with the [_serverless-spa-deploy_](https://github.com/DanteInc/serverless-spa-deploy) plugin.

## serverless.yml

> Optional settings are commented out and show default values

```
plugins:
  - serverless-spa-deploy
  - serverless-spa-apig

custom:
  spa:
    files: # per serverless-spa-deploy
      ...
  dns:
    hostedZoneId: ZZZZZZZZZZZZZZ
    domainName: example.com
    endpoint: app.${self:custom.cdn.domainName}
```
