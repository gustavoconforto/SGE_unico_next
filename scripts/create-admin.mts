// Creates an administrator through Better Auth (it hashes the password), for a fresh production database:
//   DATABASE_URL=<neon url> npm run create-admin -- <username> "<Full name>" [email]
// The password is asked for (hidden), or read from ADMIN_PASSWORD.
import "dotenv/config";

const [username, name, email] = process.argv.slice(2);
if (!username || !name) {
  console.error('Usage: npm run create-admin -- <username> "<Full name>" [email]');
  process.exit(1);
}

/** Reads a line from the terminal without echoing it (raw mode: Enter ends, Backspace erases, Ctrl+C quits). */
function hidden(prompt: string): Promise<string> {
  const { stdin, stdout } = process;
  if (!stdin.isTTY) {
    console.error("No terminal to ask the password: set ADMIN_PASSWORD.");
    process.exit(1);
  }
  stdout.write(prompt);
  stdin.setRawMode(true);
  stdin.setEncoding("utf8");
  stdin.resume();
  return new Promise((resolve) => {
    let value = "";
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\u0003") process.exit(130);
        if (ch === "\r" || ch === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          stdout.write("\n");
          return resolve(value);
        }
        value = ch === "\u007f" || ch === "\b" ? value.slice(0, -1) : value + ch;
      }
    };
    stdin.on("data", onData);
  });
}

async function askPassword(): Promise<string> {
  const password = await hidden("Password (min. 8 characters): ");
  const again = await hidden("Repeat the password: ");
  if (password !== again) {
    console.error("The passwords don't match.");
    process.exit(1);
  }
  return password;
}

const password = process.env.ADMIN_PASSWORD ?? (await askPassword());
if (password.length < 8) {
  console.error("The password must have at least 8 characters.");
  process.exit(1);
}

const { auth } = await import("../src/lib/auth");
const login = username.trim().toLowerCase();
const { user } = await auth.api.createUser({
  body: { email: (email ?? `${login}@gestao.local`).toLowerCase(), password, name, role: "admin", data: { username: login, displayUsername: username.trim() } },
});
console.log(`Admin "${user.name}" created: log in as ${login}.`);
process.exit(0);
