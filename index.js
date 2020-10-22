const path = require('path');
const _ = require('lodash');
const yaml = require('js-yaml');
const fs = require('fs');

class Plugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.hooks = {
      'before:deploy:createDeploymentArtifacts': this.beforeCreateDeploymentArtifacts.bind(this),
    };
  }

  beforeCreateDeploymentArtifacts() {
    if (this.serverless.service.custom.apig === undefined) {
      this.serverless.service.custom.apig = true;
    }

    const enabled = this.serverless.service.custom.apig;
    if (enabled === false) return;

    const baseResources = this.serverless.service.provider.compiledCloudFormationTemplate;

    // console.log(this.serverless);

    const filename = path.resolve(__dirname, 'resources.yml'); // eslint-disable-line
    const content = fs.readFileSync(filename, 'utf-8');
    const resources = yaml.safeLoad(content, {
      filename: filename
    });

    this.prepareResources(resources);

    return this.serverless.variables.populateObjectImpl(resources)
      .then((resources) => {
        return _.merge(baseResources, resources);
      });
  }

  prepareResources(resources) {
    if (!this.serverless.service.custom.dns) {
      this.serverless.service.custom.dns = {};
    }

    this.prepareDeployment(resources.Resources);
    // this.prepareWaf(resources);
  }

  // prepareWaf(resources) {
  //   const webACLId = this.serverless.service.custom.apig.webACLId;

  //   if (!webACLId) {
  //     delete resources.SpaServerWebACLAssociation;
  //   }
  // }

  prepareDeployment(resources) {
    const instanceId = this.serverless.instanceId;
    const ApiGatewayDeployment = resources.ApiGatewayDeployment;
    delete resources.ApiGatewayDeployment;
    resources.SpaServerBasePathMapping.DependsOn[1] = `ApiGatewayDeployment${instanceId}`;
    resources[`ApiGatewayDeployment${instanceId}`] = ApiGatewayDeployment;
  }
}

module.exports = Plugin;
