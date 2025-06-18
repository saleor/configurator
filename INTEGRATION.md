# Integrating Saleor Configurator with Quickstart

This document describes how to integrate and use the Saleor Configurator with the Saleor Quickstart project.

## Prerequisites

- Kubernetes cluster (Minikube, Docker Desktop with Kubernetes, or a cloud provider)
- kubectl installed and configured to access your cluster
- [Tilt](https://tilt.dev/) installed
- Docker installed

## Setup Steps

### 1. Directory Structure

Ensure your directory structure looks like this:

```
quickstart/            # Original quickstart project
  backend/
  frontend/
  service/
  k8s/
  Tiltfile            # Original quickstart Tiltfile
  ...

configurator/          # Your configurator project (this repository)
  src/
  k8s/
  config.yml
  Dockerfile
  Tiltfile            # New Tiltfile that integrates both projects
  ...
```

### 2. Copy Files

Copy the following files from the configurator project to the quickstart project:

1. The Tiltfile from configurator to quickstart (backup the original first)
2. The k8s/configurator.yaml from configurator to quickstart/k8s/
3. The config.yml from configurator to quickstart/

### 3. Build and Deploy

Navigate to the quickstart directory and run:

```bash
tilt up
```

This will start all the services, including the configurator.

## How It Works

1. The Tiltfile builds a Docker image for the configurator
2. The configurator is deployed as a Kubernetes pod
3. The configurator connects to the Saleor API using the app token
4. The configurator applies the configuration from config.yml

## Configuration

Edit the `config.yml` file to define your:
- Shop settings
- Channels
- Product types
- Attributes
- Page types

## Getting an App Token

To authenticate the configurator with Saleor:

1. Access the Saleor Dashboard (typically at http://localhost:9000)
2. Go to Configuration → Apps & Webhooks
3. Create a new app with appropriate permissions:
   - MANAGE_PRODUCT_TYPES_AND_ATTRIBUTES
   - MANAGE_PRODUCTS
   - MANAGE_CHANNELS
   - MANAGE_SETTINGS
4. Generate an auth token for the app
5. Update the `saleor-secrets` Secret in Kubernetes with your token:

```bash
kubectl edit secret saleor-secrets -n saleor
```

Or create a new secret with the correct token:

```bash
kubectl create secret generic saleor-secrets --from-literal=configurator-app-token=YOUR_TOKEN_HERE -n saleor
```

## Troubleshooting

- If the configurator can't connect to the API, check if the Saleor API is running
- Verify the app token has the correct permissions
- Check the configurator logs with:

```bash
kubectl logs -l app=saleor-configurator -n saleor
``` 