This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Supabase: schema + import întrebări

### Rulare schema / migrări

- **Schema**: `src/db/schema.sql`
- **Migrări**: `src/db/migrations/*.sql`

Rulează SQL-ul în **Supabase → SQL Editor**.

### Import din Excel (recomandat: CSV)

1. Pornește de la template-ul `templates/questions_import_template.csv`.
2. În Excel/Sheets: completează rândurile, apoi exportă ca **CSV** (UTF-8).
3. Generează SQL de import:

```bash
python3 scripts/import_questions_from_csv.py path/to/questions.csv > src/db/migrations/008_import_from_csv.sql
```

4. Rulează `008_import_from_csv.sql` în Supabase SQL Editor.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
