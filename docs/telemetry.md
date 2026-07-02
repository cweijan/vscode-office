# Telemetry setup (Azure Application Insights)

This guide is for **maintainers** who build and publish Office Viewer. End users should read the **Usage data** section in [README.md](../README.md) or [README-CN.md](../README-CN.md).

## Overview

| Item | Value |
|------|-------|
| SDK | [`@vscode/extension-telemetry`](https://www.npmjs.com/package/@vscode/extension-telemetry) |
| Backend | Azure Application Insights (Workspace-based) |
| Code | `src/service/telemetryService.ts` |
| Event inventory | `telemetry.json` (root) |

Telemetry is **disabled** until you set a non-empty connection string in `telemetryService.ts`.

## 1. Create Azure resources

### Sign in

1. Open [https://portal.azure.com](https://portal.azure.com)
2. Sign in with a Microsoft account (personal or work). A free Azure account is enough for an extension with moderate traffic.

### Create Log Analytics workspace (if needed)

Application Insights (workspace-based) needs a Log Analytics workspace.

1. Portal search: **Log Analytics workspaces** → **Create**
2. Choose subscription, resource group, name, and region (pick one close to you, e.g. East Asia)
3. **Review + create**

You can skip this if you already have a workspace.

### Create Application Insights

1. Portal search: **Application Insights** → **Create**
2. **Basics**
   - Name: e.g. `vscode-office-telemetry`
   - Region: same as workspace when possible
   - Resource mode: **Workspace-based**
   - Workspace: select the workspace from above
3. **Review + create** → wait for deployment
4. Open the new resource → left menu **Configure** → **Connection string**
5. Copy the full string, for example:

   ```text
   InstrumentationKey=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx;IngestionEndpoint=https://eastasia-1.in.applicationinsights.azure.com/;LiveEndpoint=https://eastasia.livediagnostics.monitor.azure.com/;ApplicationId=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

Microsoft documents the connection string as **not sensitive**; it is commonly committed in extension source. It only allows **sending** telemetry, not reading it.

## 2. Wire the extension

1. Open `src/service/telemetryService.ts`
2. Paste your connection string:

   ```typescript
   const TELEMETRY_CONNECTION_STRING = 'InstrumentationKey=...;IngestionEndpoint=...';
   ```

3. Rebuild and package:

   ```bash
   yarn build
   yarn package
   ```

4. Install the `.vsix` locally and open a supported file (e.g. `.xlsx`) once
5. In Azure Portal → your Application Insights → **Logs**, run:

   ```kusto
   customEvents
   | where timestamp > ago(30m)
   | where name == "view.open"
   | project timestamp, name, customDimensions
   | order by timestamp desc
   ```

   Events may take **2–5 minutes** to appear the first time.

## 3. Sample queries

### Views by type

```kusto
customEvents
| where name == "view.open"
| extend viewType = tostring(customDimensions.viewType)
| extend fileType = tostring(customDimensions.fileType)
| summarize count() by viewType, fileType
| order by count_ desc
```

### Daily active users (DAU)

Uses Application Insights anonymous `user_Id` (not PII).

```kusto
customEvents
| where name == "view.open"
| summarize DAU = dcount(user_Id) by bin(timestamp, 1d)
| order by timestamp desc
```

### Extension version breakdown

```kusto
customEvents
| where name == "view.open"
| extend viewType = tostring(customDimensions.viewType)
| summarize count() by viewType, appVersion
| order by count_ desc
```

## 4. Cost and limits

- Application Insights bills on **ingested data volume**
- This extension sends small, infrequent events; typical usage stays within the **free monthly allowance** for personal/small extensions
- Monitor **Usage and estimated costs** in the Azure Portal if traffic grows

## 5. User controls (already implemented)

| Control | Setting |
|---------|---------|
| VS Code global | `telemetry.telemetryLevel` / `telemetry.enableTelemetry` |
| Extension only | `vscode-office.enableTelemetry` (default: `true`) |

`@vscode/extension-telemetry` checks `env.isTelemetryEnabled` before sending.

## 6. Verify event inventory locally

After building the extension, you can inspect declared events:

```bash
code --telemetry > /tmp/vscode-telemetry.json
```

If `telemetry.json` is packaged with the extension, Office Viewer events appear in that report.

## Troubleshooting

| Problem | Check |
|---------|--------|
| No events in Logs | Connection string set and non-empty? Rebuilt after change? Wait a few minutes |
| Still no events | VS Code telemetry off? `vscode-office.enableTelemetry` false? |
| Events in dev only | Published VSIX built **after** adding the connection string |
| Query empty filter | Use `ago(24h)` or wider time range in Logs |

## Related files

- `src/service/telemetryService.ts` — reporter and event API
- `src/service/officeViewType.ts` — `viewType` / `fileType` mapping
- `src/provider/officeViewerProvider.ts` — office preview events
- `telemetry.json` — event metadata for transparency
