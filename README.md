# aos-repo

Public package repository for aOS  
Endpoint: https://repo.aosproject.workers.dev/main/

This repository hosts all officially supported aOS packages, images, files, and kernel modules.
By default, the aOS Package Manager (APM) pulls from the `main` branch of this repository unless configured otherwise.

Unless explicitly stated, all content in this repository is licensed under the [MIT License](./LICENSE).

## Checksums

Each item directory (or the `iso` directory when applicable) includes:

- keys.txt — SHA256 checksums (plain text)
- keys.json — SHA256 checksums (JSON)

Checksums are automatically generated and updated via GitHub Actions whenever files change.

## Repository API

Docs: https://repo.aosproject.workers.dev/docs

To fetch a file:
```http
GET https://repo.aosproject.workers.dev/main/{filepath}
```
Where `{filepath}` matches the path in the `main` branch of this repository.
This API is used by APM and other aOS services. The API features includes built-in caching and rate-limit handling and other customizations for APM.

