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

    this.preparePartition(resources.Resources);
    this.prepareDeployment(resources.Resources);
    this.prepareWaf(resources.Resources);
    this.prepareDomainName(resources);
  }

  preparePartition(resources) {
    const partition = this.serverless.service.custom.partition;

    if (partition) {
      const root = resources.SpaServerRootMethod.Properties.Integration.Uri['Fn::Join'][1][0].split(':');
      root[1] = partition;
      resources.SpaServerRootMethod.Properties.Integration.Uri['Fn::Join'][1][0] = root.join(':');

      const proxy = resources.SpaServerProxyMethod.Properties.Integration.Uri['Fn::Join'][1][0].split(':');
      proxy[1] = partition;
      resources.SpaServerProxyMethod.Properties.Integration.Uri['Fn::Join'][1][0] = proxy.join(':');
    }
  }

  prepareWaf(resources) {
    const webACLId = this.serverless.service.custom.apig.webACLId;
    const instanceId = this.serverless.instanceId;

    if (webACLId) {
      resources.SpaServerWebACLAssociation.Properties.ResourceArn.Ref = `SpaServerDeployment${instanceId}`;
    } else {
      delete resources.SpaServerWebACLAssociation;
    }
  }

  prepareDeployment(resources) {
    const instanceId = this.serverless.instanceId;
    const SpaServerDeployment = resources.SpaServerDeployment;
    delete resources.SpaServerDeployment;
    resources.SpaServerBasePathMapping.DependsOn[1] = `SpaServerDeployment${instanceId}`;
    resources[`SpaServerDeployment${instanceId}`] = SpaServerDeployment;
  }

  prepareDomainName(resources) {
    const domainName = this.serverless.service.custom.dns.domainName;
    const basePath = this.serverless.service.custom.dns.basePath;
    const endpoint = this.serverless.service.custom.dns.endpoint;

    if (basePath) {
      resources.Resources.SpaServerBasePathMapping.Properties.DomainName = domainName;
      resources.Resources.SpaServerBasePathMapping.Properties.BasePath = basePath;
      resources.Resources.SpaServerBasePathMapping.DependsOn.pop();
      resources.Outputs.SpaURL.Value = `https://${domainName}/${basePath}`
    }

    if (!endpoint) {
      delete resources.Resources.SpaServerDomainName;
      delete resources.Resources.SpaServerEndpointRecord
      if (!basePath) {
        delete resources.Resources.SpaServerBasePathMapping
        delete resources.Outputs.SpaURL
      }
    }
  }
}

module.exports = Plugin;
