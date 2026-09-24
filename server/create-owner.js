const argon2 = require('argon2')
const readline = require('readline')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const envPath = path.join(__dirname, '.env')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve)
  })
}

async function createOwner() {
  console.log('')
  console.log('======================================')
  console.log('       MC2 LABS - OWNER SETUP')
  console.log('======================================')
  console.log('')

  try {
    const email = await ask('Owner email: ')
    const password = await ask('Create owner password: ')

    if (!email.trim()) {
      throw new Error('Email cannot be empty.')
    }

    if (password.length < 12) {
      throw new Error(
        'Password must contain at least 12 characters.'
      )
    }

    console.log('')
    console.log('Creating secure Argon2 password hash...')

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    })

    const jwtSecret = crypto.randomBytes(64).toString('hex')

    const envContent = [
      'PORT=5000',
      'NODE_ENV=development',
      '',
      `OWNER_NAME="Mohamed Chedly Yousfi"`,
      `OWNER_EMAIL="${email.trim().toLowerCase()}"`,
      `OWNER_PASSWORD_HASH="${passwordHash}"`,
      '',
      `JWT_SECRET="${jwtSecret}"`,
      '',
    ].join('\n')

    fs.writeFileSync(envPath, envContent, {
      encoding: 'utf8',
      flag: 'w',
    })

    console.log('')
    console.log('======================================')
    console.log('          OWNER CREATED')
    console.log('======================================')
    console.log('Name: Mohamed Chedly Yousfi')
    console.log(`Email: ${email.trim().toLowerCase()}`)
    console.log('Role: OWNER')
    console.log('Password: ARGON2ID HASHED')
    console.log('JWT secret: GENERATED')
    console.log('')
    console.log('.env created successfully.')
    console.log('Do not share or upload the .env file.')
    console.log('======================================')
  } catch (error) {
    console.error('')
    console.error('Setup failed:', error.message)
  } finally {
    rl.close()
  }
}

createOwner()