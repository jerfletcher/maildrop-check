# maildrop-check

Lightweight CLI to inspect Maildrop inboxes using their GraphQL API.

About Maildrop

Maildrop ([https://maildrop.cc](https://maildrop.cc)) is a free disposable email service that provides temporary inboxes you can view without registering. It exposes a public GraphQL API at [https://api.maildrop.cc/graphql](https://api.maildrop.cc/graphql) which this tool queries to list messages and fetch message HTML/content.

This tool is a small, zero-dependency Node.js command-line utility for quickly viewing messages in disposable Maildrop inboxes. See the Maildrop site and API for more details.

See [`package.json`](package.json:1) and [`index.js`](index.js:1) for implementation details.

## Features

- Query a Maildrop inbox and list messages (titles).
- Fetch full HTML content for up to 3 most recent messages.
- Human-friendly text output and machine-friendly JSON output.
- Small, single-file implementation with no third-party dependencies.

## Installation

Install globally with npm:

```bash
npm install -g git+https://github.com/your-username/maildrop-check.git
```

Or clone and install locally:

```bash
git clone https://github.com/your-username/maildrop-check.git
cd maildrop-check
npm install
```

## Usage

Run the installed binary:

```bash
maildrop-check disposable-email-address
```

Using npm scripts:

```bash
npm run check -- disposable-email-address
npm run check:json -- disposable-email-address@maildrop.cc
```

Run directly with Node:

```bash
node index.js disposable-email-address --json
```

While running without arguments the tool opens an interactive REPL:

- Enter "disposable-email-address" or "disposable-email-address@maildrop.cc" to check that inbox (example disposable address).
- Use "--json" (or "-j") or run the `npm run check:json` script to show JSON output (recommended for scripts and automation).
- Use "quit" to exit.

## Output

- Human mode prints up to 3 messages with HTML and lists titles for the rest.
- JSON mode prints a structured object: { mailbox, messages } where messages may include content: { data, html }.

## Contributing

Contributions welcome. Open issues and pull requests on the repository. When contributing:

- Fork the repo and open a PR with a clear description.
- Add tests or examples when adding features.
- Update the README with any breaking changes.

## License

MIT — see the included [LICENSE](LICENSE:1).

## Notes

- The package exposes a CLI named "maildrop-check" (see [`package.json`](package.json:1)).
- Update the repository URL in package.json before publishing.
- Requires Node.js >= 14.