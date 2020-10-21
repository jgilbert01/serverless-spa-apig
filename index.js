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
    if (!this.serverless.service.custom.apig) {
      this.serverless.service.custom.apig = {};
    }
    if (!this.serverless.service.custom.dns) {
      this.serverless.service.custom.dns = {};
    }

    // everything except buckets
    const disabled = this.serverless.service.custom.apig.disabled;
    const enabled = this.serverless.service.custom.apig.enabled;
    if ((disabled === undefined && enabled === undefined) || (disabled != undefined && !disabled) || (enabled != undefined && enabled.includes(this.options.stage))) {
      // TODO
      // this.prepareCertificate(distributionConfig, redirectDistributionConfig);
      // this.prepareWaf(distributionConfig, redirectDistributionConfig);

      console.log(this.serverless.instanceId);
      this.prepareDeployment(resources.Resources);

      // TODO
      // this.prepareSpaEndpointRecord(resources);
    } else {
      // delete resources.Resources.SpaEndpointRecord;
      // delete resources.Outputs.SpaURL;
    }
  }

  // prepareCertificate(distributionConfig, redirectDistributionConfig) {
  //   const acmCertificateArn = this.serverless.service.custom.apig.acmCertificateArn;
  //   if (acmCertificateArn) {
  //     distributionConfig.ViewerCertificate.AcmCertificateArn = acmCertificateArn;
  //     redirectDistributionConfig.ViewerCertificate.AcmCertificateArn = acmCertificateArn;

  //     const minimumProtocolVersion = this.serverless.service.custom.apig.minimumProtocolVersion;
  //     if (minimumProtocolVersion) {
  //       distributionConfig.ViewerCertificate.MinimumProtocolVersion = minimumProtocolVersion;
  //       redirectDistributionConfig.ViewerCertificate.MinimumProtocolVersion = minimumProtocolVersion;
  //     }

  //     distributionConfig.DefaultCacheBehavior.ViewerProtocolPolicy = 'redirect-to-https';
  //     redirectDistributionConfig.DefaultCacheBehavior.ViewerProtocolPolicy = 'redirect-to-https';
  //   } else {
  //     delete distributionConfig.ViewerCertificate;
  //     delete redirectDistributionConfig.ViewerCertificate;
  //   }
  // }

  // prepareWaf(distributionConfig, redirectDistributionConfig) {
  //   const webACLId = this.serverless.service.custom.apig.webACLId;

  //   if (webACLId) {
  //     distributionConfig.WebACLId = webACLId;
  //     redirectDistributionConfig.WebACLId = webACLId;
  //   } else {
  //     delete distributionConfig.WebACLId;
  //     delete redirectDistributionConfig.WebACLId;
  //   }
  // }

  prepareDeployment(resources) {
    const instanceId = this.serverless.instanceId;
    const ApiGatewayDeployment = resources.ApiGatewayDeployment;
    delete resources.ApiGatewayDeployment;
    resources[`ApiGatewayDeployment${instanceId}`] = ApiGatewayDeployment;
  }

  // prepareSpaEndpointRecord(resources) {
  //   const hostedZoneId = this.serverless.service.custom.dns.hostedZoneId;
  //   if (hostedZoneId) {
  //     const properties = resources.Resources.SpaEndpointRecord.Properties;
  //     const redirectProperties = resources.Resources.RedirectEndpointRecord.Properties;

  //     properties.HostedZoneId = hostedZoneId;
  //     redirectProperties.HostedZoneId = hostedZoneId;

  //     const endpoint = this.serverless.service.custom.dns.endpoint;
  //     if (endpoint) {
  //       properties.Name = `${endpoint}.`;

  //       const protocol = this.serverless.service.custom.apig.acmCertificateArn ? 'https' : 'http';
  //       resources.Outputs.SpaURL.Value = `${protocol}://${endpoint}`;
  //     } else {
  //       delete resources.Resources.SpaEndpointRecord;
  //       delete resources.Outputs.SpaURL;
  //     }

  //     const domainName = this.serverless.service.custom.dns.domainName;
  //     if (domainName) {
  //       redirectProperties.Name = `${domainName}.`;
  //     } else {
  //       delete resources.Resources.RedirectEndpointRecord;
  //     }

  //   } else {
  //     delete resources.Resources.SpaEndpointRecord;
  //     delete resources.Outputs.SpaURL;
  //   }
  // }
}

module.exports = Plugin;
