require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const readline = require('readline');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (question, mask = false) =>
  new Promise((resolve) => {
    if (!mask) {
      rl.question(question, (answer) => resolve(answer.trim()));
      return;
    }

    const stdin = process.openStdin();
    process.stdin.on('data', (char) => {
      char = char + '';
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          process.stdin.pause();
          break;
        default:
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
          process.stdout.write(question + Array(rl.line.length + 1).join('*'));
          break;
      }
    });

    rl.question(question, (value) => {
      rl.history = rl.history.slice(1);
      resolve(value.trim());
    });
  });

const ensureStrongPassword = (password) => {
  const rules = [
    { test: /.{8,}/, msg: 'at least 8 characters' },
    { test: /[a-z]/, msg: 'a lowercase letter' },
    { test: /[A-Z]/, msg: 'an uppercase letter' },
    { test: /\d/, msg: 'a number' },
    { test: /[^A-Za-z0-9]/, msg: 'a special character' },
  ];

  const failed = rules.filter((rule) => !rule.test.test(password)).map((rule) => rule.msg);
  return failed;
};

(async () => {
  try {
    await connectDB();

    console.log('Super Admin bootstrap');

    const name = await ask('Name: ');
    if (!name) {
      throw new Error('Name is required');
    }

    const email = await ask('Email: ');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Valid email is required');
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new Error('A user with that email already exists');
    }

    let password;
    while (true) {
      password = await ask('Password: ', true);
      const confirm = await ask('\nConfirm Password: ', true);
      process.stdout.write('\n');

      if (password !== confirm) {
        console.log('Passwords do not match. Please try again.');
        continue;
      }

      const issues = ensureStrongPassword(password);
      if (issues.length) {
        console.log(`Password must include ${issues.join(', ')}.`);
        continue;
      }

      break;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const superAdmin = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'superadmin',
    });

    console.log(`\n✅ Super admin created: ${superAdmin.email}`);
  } catch (error) {
    console.error('\n❌ Failed to create super admin:', error.message);
  } finally {
    rl.close();
    process.exit(0);
  }
})();
