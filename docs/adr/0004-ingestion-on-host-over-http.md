# Ingestion runs on the host, triggered over HTTP

Ingestion runs inside the deployed service and is started by a token-protected admin endpoint, called from an API client such as Postman, rather than by a cron job or a shell command. The free hosting tier has no shell and no free cron, and running on the host lets the founders see a deployed system ingest a source they pick. A run interrupted by the instance sleeping simply resumes on the next trigger, because unchanged pages are skipped. A scheduled run is a next step.
