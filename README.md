# Blue Republic Legislation — Cloudflare D1

This project is ready for **Cloudflare Pages + Pages Functions + D1**.

## What is included

- Public legislation, parliamentary business, votes and members pages
- Search, filtering and sorting
- Clickable public member profiles
- Member party, title, constituency, affiliation and biography
- Complete member voting histories
- Admin editing for documents, progress stages, related documents and publication status
- Admin editing for members
- Admin creation/editing/deletion of votes with a choice for every member
- Automatic vote totals and outcomes
- Cloudflare D1 persistence across devices

## 1. Create a GitHub repository

Upload the contents of this folder to a new repository. Keep this structure:

```text
public/
  index.html
  app.js
functions/
  api/
    [[path]].js
schema.sql
seed.sql
wrangler.toml
```

## 2. Create the D1 database

In Cloudflare:

1. Open **Storage & Databases**.
2. Open **D1 SQL Database**.
3. Select **Create database**.
4. Name it `blue-legislation`.
5. Copy its database ID.

Rename `wrangler.toml.example` to `wrangler.toml` and replace:

```toml
database_id = "PASTE_YOUR_DATABASE_ID_HERE"
```

with the real database ID.

## 3. Create the tables

Open the database's **Console** page.

Paste the complete contents of `schema.sql` and run it.

To add the example records, paste and run `seed.sql` afterwards. This step is optional.

## 4. Deploy through Cloudflare Pages

1. Go to **Workers & Pages**.
2. Select **Create application**.
3. Select **Pages** and connect the GitHub repository.
4. Framework preset: **None**.
5. Build command: `exit 0`.
6. Build output directory: `public`.
7. Deploy.

Cloudflare Pages uses the `/functions` directory for the API routes.

## 5. Connect D1 to the Pages project

In the Pages project:

1. Open **Settings**.
2. Open **Bindings**.
3. Add a **D1 database binding**.
4. Variable name: `DB`.
5. Select `blue-legislation`.
6. Save and redeploy.

The binding name must be exactly `DB`.

## 6. Protect the admin panel

In the Pages project:

1. Open **Settings** → **Variables and Secrets**.
2. Add an encrypted secret named `ADMIN_TOKEN`.
3. Set it to a long private password.
4. Redeploy.

On the website, open **Admin** and enter that same token. It is kept only in the current browser session.

Do not publish the token in GitHub or put it inside `wrangler.toml`.

## Important deletion behaviour

- Deleting a document also deletes its progress stages, related links and votes.
- Deleting a member also deletes that member's recorded choices from historical votes.
- Deleting a vote deletes all choices attached to it.

This is enforced by foreign keys in `schema.sql`.
