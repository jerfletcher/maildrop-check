#!/usr/bin/env node
const https = require('https');
const readline = require('readline');

/**
 * POST a GraphQL query to Maildrop and return { statusCode, headers, body }.
 */
function postGraphQL(query, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query });
    const req = https.request('https://api.maildrop.cc/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.setTimeout(timeout, () => {
      req.abort();
      reject(new Error('Request timed out'));
    });
    req.write(data);
    req.end();
  });
}

function parseInboxFromInput(input) {
  input = String(input || '').trim();
  if (!input) return null;
  const parts = input.split(/\s+/);
  if (parts[0].toLowerCase() === 'check') {
    return parts[1] || null;
  }
  if (input.includes('@')) {
    return input.split('@')[0];
  }
  return parts[0];
}

/**
 * Fetch a single message by id with data and html fields.
 */
async function fetchMessageById(id, mailbox) {
  if (!id) return null;
  // include mailbox when querying for full message content
  const mb = mailbox ? mailbox : '';
  const gql = `query { message(mailbox: "${mb}", id: "${id}") { id headerfrom subject date data html } }`;
  try {
    const res = await postGraphQL(gql);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const parsed = JSON.parse(res.body);
      return parsed && parsed.data ? parsed.data.message : null;
    }
  } catch (err) {
    // ignore per-message failure, return null
  }
  return null;
}

/**
 * checkInbox(inbox, opts)
 * opts = { json: boolean } -> if true prints raw JSON of inbox array
 * Also fetches content (data, html) for the most recent 3 messages.
 */
async function checkInbox(inbox, opts = { json: false }) {
  if (!inbox) {
    console.log('No inbox specified');
    return;
  }
  const mailbox = inbox;
  const gql = `query Example { inbox(mailbox:\"${mailbox}\") { id headerfrom subject date } }`;
  try {
    const res = await postGraphQL(gql);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      let json;
      try {
        json = JSON.parse(res.body);
      } catch (err) {
        console.log('Received non-JSON response:');
        console.log(res.body);
        return;
      }
      const list = (json && json.data && Array.isArray(json.data.inbox)) ? json.data.inbox : [];
      if (list.length === 0) {
        if (opts.json) {
          console.log(JSON.stringify({ mailbox: `${mailbox}@maildrop.cc`, messages: [] }, null, 2));
        } else {
          console.log(`No messages found for ${mailbox}@maildrop.cc`);
        }
        return;
      }

      // Get up to 3 most recent messages' full data/html, and keep titles for the rest
      const recent = list.slice(0, 3);
      const details = await Promise.all(recent.map(m => fetchMessageById(m.id, mailbox)));
      
      // Merge available detail fields back into messages array (for the first 3)
      // Split content into a dedicated `content` object { data, html } and remove top-level data/html
      const mergedRecent = recent.map((m, i) => {
        const d = details[i] || {};
        const base = Object.assign({}, m);
        if (d.data || d.html) {
          base.content = {
            data: d.data || null,
            html: d.html || null
          };
        }
        return base;
      });
      
      // Titles for remaining messages (id, headerfrom, subject, date)
      const remaining = list.slice(3).map(m => ({
        id: m.id,
        headerfrom: m.headerfrom,
        subject: m.subject,
        date: m.date
      }));
      
      // Final messages: first up to 3 with full content, then titles only for the rest
      const finalMessages = mergedRecent.concat(remaining);
      
      if (opts.json) {
        // JSON view: include both data and html (inside content)
        console.log(JSON.stringify({ mailbox: `${mailbox}@maildrop.cc`, messages: finalMessages }, null, 2));
        return;
      }
      
      // Human view: show only html for the first up-to-3 messages (no raw data)
      console.log(`Found ${list.length} message(s) for ${mailbox}@maildrop.cc (showing up to 3 with html):`);
      mergedRecent.forEach(m => {
        console.log(`- id: ${m.id} | from: ${m.headerfrom} | subject: ${m.subject} | date: ${m.date}`);
        if (m.content && m.content.html) {
          console.log('  html:');
          console.log(m.content.html);
        }
      });
      
      if (remaining.length > 0) {
        console.log('');
        console.log('Other messages (titles only):');
        remaining.forEach(m => {
          console.log(`- id: ${m.id} | from: ${m.headerfrom} | subject: ${m.subject} | date: ${m.date}`);
        });
      }
      return;
    } else {
      console.log(`Maildrop returned HTTP ${res.statusCode}`);
      console.log(res.body);
    }
  } catch (err) {
    console.error('Error querying Maildrop API:', err && err.message ? err.message : err);
  }
}

/* CLI behavior:
   - Arguments: mailbox and optional flags (e.g., --json)
   - If a mailbox argument is provided, run check and exit.
   - Otherwise start interactive REPL.
*/
const rawArgs = process.argv.slice(2);
const argMailbox = rawArgs.find(a => !a.startsWith('-'));
const jsonFlag = rawArgs.includes('--json') || rawArgs.includes('-j');

if (argMailbox) {
  const inbox = parseInboxFromInput(argMailbox);
  (async () => {
    await checkInbox(inbox, { json: jsonFlag });
    process.exit(0);
  })();
} else {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "maildrop> "
  });

  console.log("Simple Maildrop checker (uses GraphQL API)");
  console.log("Usage examples:");
  console.log("  npm run check -- test           -> checks test@maildrop.cc");
  console.log("  npm run check -- test --json    -> prints JSON output");
  console.log("  node index.js test              -> checks test@maildrop.cc");
  console.log("  node index.js test --json       -> prints JSON output");
  console.log("  test@maildrop.cc                -> checks test@maildrop.cc");
  console.log("  check test --json               -> interactive command with JSON");
  console.log("  quit                            -> exit");
  rl.prompt();

  rl.on('line', async (line) => {
    const cmd = line.trim();
    if (!cmd) { rl.prompt(); return; }
    if (cmd.toLowerCase() === 'quit' || cmd.toLowerCase() === 'exit') {
      rl.close();
      return;
    }
    const inbox = parseInboxFromInput(cmd);
    const jsonOutput = cmd.includes('--json') || cmd.includes('-j');
    if (!inbox) {
      console.log("Could not determine inbox. Try 'check test' or 'test@maildrop.cc'");
      rl.prompt();
      return;
    }
    console.log(`Checking ${inbox}@maildrop.cc ...`);
    await checkInbox(inbox, { json: jsonOutput });
    rl.prompt();
  }).on('close', () => {
    console.log('Goodbye.');
    process.exit(0);
  });
}