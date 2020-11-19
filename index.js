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
      this.serverless.service.custom.apig = false;
    }

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
    this.preparePartition(resources.Resources);
    this.prepareDeployment(resources.Resources);
    this.prepareWaf(resources.Resources);
    this.prepareDomainName(resources);
    this.prepareRecordSet(resources.Resources);
    this.prepareApiGateway(resources);
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
    const apig = this.serverless.service.custom.apig;
    if (!apig) return;

    const instanceId = this.serverless.instanceId;
    const SpaServerDeployment = resources.SpaServerDeployment;
    delete resources.SpaServerDeployment;
    resources.SpaServerBasePathMapping.DependsOn[1] = `SpaServerDeployment${instanceId}`;
    resources[`SpaServerDeployment${instanceId}`] = SpaServerDeployment;
  }

  prepareDomainName(resources) {
    const domainName = this.serverless.service.custom.apig.domainName;

    if (!domainName) {
      delete resources.Resources.SpaServerDomainName;
      delete resources.Resources.SpaServerEndpointRecord;
      delete resources.Resources.SpaServerBasePathMapping;
      delete resources.Outputs.SpaURL;
    }
  }

  prepareRecordSet(resources) {
    const hostedZoneId = this.serverless.service.custom.apig.hostedZoneId;

    if (!hostedZoneId) {
      delete resources.SpaServerEndpointRecord;
    }
  }

  prepareApiGateway(resources) {
    const apig = this.serverless.service.custom.apig;

    if (!apig) {
      delete resources.Resources.APIGatewayAWSProxyExecRole;
      delete resources.Resources.SpaServer;
      delete resources.Resources.SpaServerResource;
      delete resources.Resources.SpaServerRootMethod;
      delete resources.Resources.SpaServerProxyMethod;
      delete resources.Resources.SpaServerDeployment;
      delete resources.Outputs.SpaServerId;
    }
  }
}

module.exports = Plugin;
