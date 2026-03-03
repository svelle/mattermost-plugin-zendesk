# Mattermost Zendesk Plugin

A Mattermost plugin that integrates with Zendesk, allowing your team to manage support tickets, search the help center, and receive real-time notifications — all without leaving Mattermost.

## Features

- **Per-user Zendesk authentication** via OAuth 2.0 (authorization code flow)
- **Slash commands** (`/zendesk`) to connect, create tickets, search, and more
- **Right-Hand Sidebar panel** with your assigned tickets and a search interface
- **Create tickets from messages** using the post hover menu action
- **Webhook notifications** for ticket lifecycle events (created, updated, solved, closed, commented)
- **Channel subscriptions** with optional group and priority filters
- **Help Center article search** from within Mattermost
- **Rich ticket formatting** with status colors, priority badges, and direct links

## Setup

### Prerequisites

- Mattermost Server v6.2.1+
- A Zendesk account with Admin access

### Step 1: Create an OAuth Client in Zendesk

1. In Zendesk, go to **Admin Center** > **Apps and integrations** > **APIs** > **Zendesk API**
2. Click the **OAuth Clients** tab, then **Add OAuth client**
3. Fill in the form:

| Field | Value |
|-------|-------|
| **Name** | `Mattermost Zendesk Plugin` (or any name you prefer) |
| **Description** | `OAuth client for the Mattermost Zendesk integration` |
| **Company** | Your company name |
| **Logo** | (optional) Upload an icon for the authorization screen |
| **Identifier** | `mattermost-zendesk` (this becomes the **OAuth Client ID** in the plugin settings — you can choose any unique string) |
| **Client kind** | **Confidential** (the plugin runs server-side and can securely store the secret) |
| **Redirect URLs** | `https://<your-mattermost-url>/plugins/com.github.svelle.mattermost-plugin-zendesk/api/v1/oauth/callback` |

4. Click **Save**
5. Zendesk will display a **Secret**. **Copy the secret now** — it is only shown once. This becomes the **OAuth Client Secret** in the plugin settings.

> **Important:**
> - The **Redirect URL** must exactly match your Mattermost Site URL. Replace `<your-mattermost-url>` with your actual Mattermost URL (e.g. `https://mattermost.example.com`).
> - **Client kind** must be set to **Confidential**, not Public. Confidential clients use a secret to exchange the authorization code for a token, which is what this plugin does.
> - The **Identifier** you choose here is the value you'll enter as **OAuth Client ID** in the Mattermost plugin settings.

### Step 2: Install the Plugin in Mattermost

1. Download the latest release from the [Releases page](https://github.com/svelle/mattermost-plugin-zendesk/releases), or build from source (see [Development](#development))
2. Go to **System Console** > **Plugins** > **Plugin Management**
3. Upload the `.tar.gz` file and enable the plugin

### Step 3: Configure the Plugin

Go to **System Console** > **Plugins** > **Zendesk** and fill in:

| Setting | Description | Example |
|---------|-------------|---------|
| **Zendesk Subdomain** | Your Zendesk subdomain (the part before `.zendesk.com`). If your Zendesk URL is `https://mycompany.zendesk.com`, enter `mycompany`. | `mycompany` |
| **OAuth Client ID** | The **Identifier** you entered when creating the Zendesk OAuth client | `mattermost-zendesk` |
| **OAuth Client Secret** | The **Secret** that Zendesk displayed after saving the OAuth client | (paste the secret you copied in Step 1) |
| **Webhook Secret** | Auto-generated. Used to verify incoming Zendesk webhooks. | (click Regenerate if empty) |
| **Encryption Key** | Auto-generated. Used to encrypt stored OAuth tokens. **Do not change after users have connected.** | (click Regenerate if empty) |

Click **Save**.

### Step 4: Connect Your Account

In any Mattermost channel, type:

```
/zendesk connect
```

Click the link to authorize Mattermost to access your Zendesk account. Once complete, you'll receive a DM confirmation from the Zendesk bot.

### Step 5: Set Up Webhook Notifications (Optional)

To receive ticket notifications in Mattermost channels:

#### 5a. Subscribe a channel

In the channel where you want notifications:

```
/zendesk subscribe
```

Or with filters:

```
/zendesk subscribe --group=Support --priority=high
```

#### 5b. Create a webhook in Zendesk

1. Go to **Admin Center** > **Apps and integrations** > **Webhooks**
2. Click **Create webhook** > **Trigger or automation**
3. Fill in:

| Field | Value |
|-------|-------|
| **Name** | `Mattermost Notifications` |
| **Endpoint URL** | `https://<your-mattermost-url>/plugins/com.github.svelle.mattermost-plugin-zendesk/api/v1/webhook` |
| **Request method** | POST |
| **Request format** | JSON |
| **Authentication** | None (signature verification is used instead) |

4. Click **Create webhook**

#### 5c. Create a trigger in Zendesk

1. Go to **Admin Center** > **Objects and rules** > **Business rules** > **Triggers**
2. Create a new trigger (e.g. "Notify Mattermost")
3. Set your conditions (e.g. "Ticket is Created", or "Ticket is Updated")
4. Under **Actions**, select **Notify webhook** > your webhook
5. Set the JSON body to:

```json
{
  "ticket_id": "{{ticket.id}}",
  "ticket_title": "{{ticket.title}}",
  "status": "{{ticket.status}}",
  "priority": "{{ticket.priority}}",
  "requester_name": "{{ticket.requester.name}}",
  "assignee_name": "{{ticket.assignee.name}}",
  "group_name": "{{ticket.group.name}}",
  "latest_comment": "{{ticket.latest_comment}}",
  "event_type": "ticket_updated",
  "ticket_url": "{{ticket.url}}"
}
```

> **Tip:** Create separate triggers for different event types and set `event_type` accordingly: `ticket_created`, `ticket_updated`, `ticket_solved`, `ticket_closed`, `ticket_commented`.

## Usage

### Slash Commands

| Command | Description |
|---------|-------------|
| `/zendesk connect` | Connect your Zendesk account via OAuth |
| `/zendesk disconnect` | Disconnect your Zendesk account |
| `/zendesk create` | Create a new Zendesk ticket (opens a dialog) |
| `/zendesk ticket [id]` | View ticket details |
| `/zendesk search [query]` | Search Zendesk tickets |
| `/zendesk article [query]` | Search Help Center articles |
| `/zendesk subscribe [--group=name] [--priority=level]` | Subscribe channel to notifications |
| `/zendesk unsubscribe` | Unsubscribe channel from notifications |
| `/zendesk help` | Show available commands |

### Right-Hand Sidebar

Click the Zendesk icon in the channel header to open the sidebar panel, which shows:

- **Connection status** — connect or disconnect your account
- **My Tickets** — your assigned tickets with status badges and direct links
- **Search** — search tickets or Help Center articles inline

### Create Ticket from a Message

Hover over any message and click the Zendesk icon in the post action menu. This opens a ticket creation dialog with the message content pre-filled as the description.

## Development

### Building

```bash
make dist
```

This produces `dist/com.github.svelle.mattermost-plugin-zendesk-<version>.tar.gz`.

### Deploying locally

```bash
export MM_SERVICESETTINGS_SITEURL=http://localhost:8065
export MM_ADMIN_TOKEN=<your-token>
make deploy
```

### Running tests

```bash
make test
```

### Watch mode

```bash
export MM_SERVICESETTINGS_SITEURL=http://localhost:8065
export MM_ADMIN_TOKEN=<your-token>
make watch
```

## License

This project is licensed under the Apache 2.0 License — see the [LICENSE](LICENSE) file for details.
