const dotenv = require('dotenv')

dotenv.config()

const { testDatabaseConnection } = require('./db')

async function run() {
  try {
    const result = await testDatabaseConnection()

    console.log('')
    console.log('======================================')
    console.log('     MC2 LABS DATABASE TEST')
    console.log('======================================')
    console.log('Status: CONNECTED')
    console.log(`Database: ${result.database_name}`)
    console.log(`Server version: ${result.version}`)
    console.log('======================================')
    console.log('')

    process.exit(0)
  } catch (error) {
    console.error('')
    console.error('======================================')
    console.error('     DATABASE CONNECTION FAILED')
    console.error('======================================')
    console.error(`Error: ${error.message}`)
    console.error('======================================')
    console.error('')

    process.exit(1)
  }
}

run()