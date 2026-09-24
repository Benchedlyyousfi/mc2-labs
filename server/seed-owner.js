const dotenv = require('dotenv')

dotenv.config()

const { pool } = require('./db')

async function seedOwner() {
  try {
    const name = process.env.OWNER_NAME
    const email = process.env.OWNER_EMAIL
    const passwordHash = process.env.OWNER_PASSWORD_HASH

    if (!name || !email || !passwordHash) {
      throw new Error(
        'OWNER_NAME, OWNER_EMAIL or OWNER_PASSWORD_HASH is missing.'
      )
    }

    const normalizedEmail = email.trim().toLowerCase()

    const [existingUsers] = await pool.execute(
      'SELECT id, email, role FROM users WHERE email = ? LIMIT 1',
      [normalizedEmail]
    )

    if (existingUsers.length > 0) {
      console.log('')
      console.log('======================================')
      console.log('       MC2 LABS OWNER SEED')
      console.log('======================================')
      console.log('Owner already exists.')
      console.log(`Role: ${existingUsers[0].role}`)
      console.log('No changes were made.')
      console.log('======================================')
      console.log('')

      await pool.end()
      return
    }

    const [result] = await pool.execute(
      `INSERT INTO users
        (name, email, password_hash, role, is_active)
       VALUES (?, ?, ?, 'OWNER', TRUE)`,
      [
        name.trim(),
        normalizedEmail,
        passwordHash,
      ]
    )

    console.log('')
    console.log('======================================')
    console.log('       MC2 LABS OWNER CREATED')
    console.log('======================================')
    console.log('Status: SUCCESS')
    console.log(`User ID: ${result.insertId}`)
    console.log('Role: OWNER')
    console.log('Password: ARGON2 HASH STORED')
    console.log('======================================')
    console.log('')

    await pool.end()
  } catch (error) {
    console.error('')
    console.error('======================================')
    console.error('       OWNER CREATION FAILED')
    console.error('======================================')
    console.error(`Error: ${error.message}`)
    console.error('======================================')
    console.error('')

    await pool.end().catch(() => {})
    process.exit(1)
  }
}

seedOwner()