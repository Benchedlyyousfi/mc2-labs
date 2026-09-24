const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const rateLimit = require('express-rate-limit')
const dotenv = require('dotenv')
const argon2 = require('argon2')
const jwt = require('jsonwebtoken')

dotenv.config()

const { pool, testDatabaseConnection } = require('./db')

const app = express()
const PORT = process.env.PORT || 5000

// ========================================
// REQUIRED ENVIRONMENT VARIABLES
// ========================================

const requiredEnv = [
  'JWT_SECRET',
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
]

for (const variable of requiredEnv) {
  if (!process.env[variable]) {
    console.error(
      `Missing required environment variable: ${variable}`
    )
    process.exit(1)
  }
}

// ========================================
// SECURITY
// ========================================

app.disable('x-powered-by')

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'same-site',
    },
  })
)

app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  })
)

app.use(express.json({ limit: '10kb' }))
app.use(
  express.urlencoded({
    extended: false,
    limit: '10kb',
  })
)

app.use(cookieParser())

// ========================================
// GLOBAL RATE LIMIT
// ========================================

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

app.use(globalLimiter)

// ========================================
// LOGIN RATE LIMIT
// ========================================

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,

  message: {
    success: false,
    message:
      'Too many login attempts. Please try again later.',
  },
})

// ========================================
// COOKIE SETTINGS
// ========================================

function getCookieOptions() {
  const isProduction =
    process.env.NODE_ENV === 'production'

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  }
}

function getClearCookieOptions() {
  const isProduction =
    process.env.NODE_ENV === 'production'

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
  }
}

// ========================================
// CREATE AUTH TOKEN
// ========================================

function createAuthToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },

    process.env.JWT_SECRET,

    {
      expiresIn: '8h',
      issuer: 'mc2-labs',
      audience: 'mc2-labs-admin',
    }
  )
}

// ========================================
// AUTHENTICATION MIDDLEWARE
// ========================================

async function requireAuth(req, res, next) {
  const token = req.cookies.mc2_session

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    })
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET,
      {
        issuer: 'mc2-labs',
        audience: 'mc2-labs-admin',
      }
    )

    const [users] = await pool.execute(
      `SELECT
        id,
        name,
        email,
        role,
        is_active
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [decoded.id]
    )

    if (
      users.length === 0 ||
      !users[0].is_active
    ) {
      res.clearCookie(
        'mc2_session',
        getClearCookieOptions()
      )

      return res.status(401).json({
        success: false,
        message: 'Account unavailable.',
      })
    }

    req.user = users[0]

    next()
  } catch (error) {
    res.clearCookie(
      'mc2_session',
      getClearCookieOptions()
    )

    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session.',
    })
  }
}

// ========================================
// OWNER AUTHORIZATION
// ========================================

function requireOwner(req, res, next) {
  if (!req.user || req.user.role !== 'OWNER') {
    return res.status(403).json({
      success: false,
      message: 'Owner access required.',
    })
  }

  next()
}

// ========================================
// AUDIT LOG HELPER
// ========================================

async function createAuditLog(
  userId,
  action,
  details,
  req
) {
  try {
    await pool.execute(
      `INSERT INTO audit_logs
        (
          user_id,
          action,
          details,
          ip_address,
          user_agent
        )
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId || null,
        action,
        details || null,
        req.ip || null,
        req.get('user-agent') || null,
      ]
    )
  } catch (error) {
    console.error(
      'Audit log error:',
      error.message
    )
  }
}

// ========================================
// ROOT
// ========================================

app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'MC2 Labs API',
    version: '1.0.0',
  })
})

// ========================================
// HEALTH
// ========================================

app.get('/api/health', async (req, res) => {
  try {
    const database =
      await testDatabaseConnection()

    res.status(200).json({
      success: true,
      status: 'online',
      service: 'MC2 Labs Backend',
      database: database.database_name,
      timestamp: new Date().toISOString(),
    })
  } catch {
    res.status(503).json({
      success: false,
      status: 'database unavailable',
      service: 'MC2 Labs Backend',
    })
  }
})

// ========================================
// LOGIN - DATABASE AUTHENTICATION
// ========================================

app.post(
  '/api/auth/login',
  loginLimiter,
  async (req, res) => {
    try {
      const { email, password } = req.body

      if (
        typeof email !== 'string' ||
        typeof password !== 'string'
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Email and password are required.',
        })
      }

      const normalizedEmail =
        email.trim().toLowerCase()

      if (
        normalizedEmail.length === 0 ||
        password.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Email and password are required.',
        })
      }

      const [users] = await pool.execute(
        `SELECT
          id,
          name,
          email,
          password_hash,
          role,
          is_active
         FROM users
         WHERE email = ?
         LIMIT 1`,
        [normalizedEmail]
      )

      // Same response for unknown email / bad password.
      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          message:
            'Invalid email or password.',
        })
      }

      const user = users[0]

      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          message:
            'Invalid email or password.',
        })
      }

      const validPassword =
        await argon2.verify(
          user.password_hash,
          password
        )

      if (!validPassword) {
        await createAuditLog(
          user.id,
          'LOGIN_FAILED',
          'Invalid password.',
          req
        )

        return res.status(401).json({
          success: false,
          message:
            'Invalid email or password.',
        })
      }

      const token =
        createAuthToken(user)

      res.cookie(
        'mc2_session',
        token,
        getCookieOptions()
      )

      await pool.execute(
        `UPDATE users
         SET last_login_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [user.id]
      )

      await createAuditLog(
        user.id,
        'LOGIN_SUCCESS',
        'User signed in successfully.',
        req
      )

      return res.status(200).json({
        success: true,
        message: 'Login successful.',

        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      })
    } catch (error) {
      console.error(
        'Login error:',
        error.message
      )

      return res.status(500).json({
        success: false,
        message:
          'Unable to complete login.',
      })
    }
  }
)

// ========================================
// CURRENT USER
// ========================================

app.get(
  '/api/auth/me',
  requireAuth,
  (req, res) => {
    res.status(200).json({
      success: true,

      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
    })
  }
)

// ========================================
// LOGOUT
// ========================================

app.post(
  '/api/auth/logout',
  async (req, res) => {
    let userId = null

    const token =
      req.cookies.mc2_session

    if (token) {
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET,
          {
            issuer: 'mc2-labs',
            audience: 'mc2-labs-admin',
          }
        )

        userId = decoded.id
      } catch {
        // Ignore invalid token during logout.
      }
    }

    res.clearCookie(
      'mc2_session',
      getClearCookieOptions()
    )

    if (userId) {
      await createAuditLog(
        userId,
        'LOGOUT',
        'User signed out.',
        req
      )
    }

    res.status(200).json({
      success: true,
      message: 'Logout successful.',
    })
  }
)

// ========================================
// PROTECTED ADMIN DASHBOARD
// ========================================

app.get(
  '/api/admin/dashboard',
  requireAuth,
  (req, res) => {
    res.status(200).json({
      success: true,

      dashboard: {
        brand: 'MC2 Labs',
        access: req.user.role,
        message:
          `Welcome, ${req.user.name}.`,
      },
    })
  }
)
// ========================================
// EMPLOYEES - LIST
// OWNER ONLY
// ========================================

app.get(
  '/api/admin/employees',
  requireAuth,
  requireOwner,
  async (req, res) => {
    try {
      const [employees] = await pool.execute(
        `SELECT
          id,
          name,
          email,
          role,
          is_active,
          created_at,
          last_login_at
         FROM users
         WHERE role = 'EMPLOYEE'
         ORDER BY created_at DESC`
      )

      return res.status(200).json({
        success: true,
        employees,
      })
    } catch (error) {
      console.error(
        'Employees list error:',
        error.message
      )

      return res.status(500).json({
        success: false,
        message: 'Unable to load employees.',
      })
    }
  }
)
// ========================================
// EMPLOYEES - CREATE
// OWNER ONLY
// ========================================

app.post(
  '/api/admin/employees',
  requireAuth,
  requireOwner,
  async (req, res) => {
    try {
      const { name, email, password } = req.body

      // -------------------------------
      // VALIDATION
      // -------------------------------

      if (
        typeof name !== 'string' ||
        typeof email !== 'string' ||
        typeof password !== 'string'
      ) {
        return res.status(400).json({
          success: false,
          message: 'Name, email and password are required.',
        })
      }

      const cleanName = name.trim()
      const normalizedEmail = email.trim().toLowerCase()

      if (
        cleanName.length < 2 ||
        cleanName.length > 100
      ) {
        return res.status(400).json({
          success: false,
          message: 'Name must contain between 2 and 100 characters.',
        })
      }

      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/

      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid email address.',
        })
      }

      if (
        password.length < 12 ||
        password.length > 128
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Password must contain between 12 and 128 characters.',
        })
      }

      // -------------------------------
      // CHECK EXISTING EMAIL
      // -------------------------------

      const [existingUsers] = await pool.execute(
        `SELECT id
         FROM users
         WHERE email = ?
         LIMIT 1`,
        [normalizedEmail]
      )

      if (existingUsers.length > 0) {
        return res.status(409).json({
          success: false,
          message:
            'An account with this email already exists.',
        })
      }

      // -------------------------------
      // HASH PASSWORD
      // -------------------------------

      const passwordHash = await argon2.hash(
        password,
        {
          type: argon2.argon2id,
        }
      )

      // -------------------------------
      // CREATE EMPLOYEE
      // -------------------------------

      const [result] = await pool.execute(
        `INSERT INTO users
          (
            name,
            email,
            password_hash,
            role,
            is_active
          )
         VALUES (?, ?, ?, 'EMPLOYEE', TRUE)`,
        [
          cleanName,
          normalizedEmail,
          passwordHash,
        ]
      )

      // -------------------------------
      // AUDIT LOG
      // -------------------------------

      await createAuditLog(
        req.user.id,
        'EMPLOYEE_CREATED',
        `Employee account created. User ID: ${result.insertId}`,
        req
      )

      // Never return password/hash.

      return res.status(201).json({
        success: true,
        message: 'Employee created successfully.',

        employee: {
          id: result.insertId,
          name: cleanName,
          email: normalizedEmail,
          role: 'EMPLOYEE',
          is_active: true,
        },
      })
    } catch (error) {
      console.error(
        'Employee creation error:',
        error.message
      )

      return res.status(500).json({
        success: false,
        message: 'Unable to create employee.',
      })
    }
  }
)
// ========================================
// EMPLOYEES - DELETE
// OWNER ONLY
// ========================================

app.delete(
  '/api/admin/employees/:id',
  requireAuth,
  requireOwner,
  async (req, res) => {
    try {
      const employeeId = Number(req.params.id)

      if (!Number.isInteger(employeeId) || employeeId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid employee ID.',
        })
      }

      const [users] = await pool.execute(
        `SELECT id, name, email, role
         FROM users
         WHERE id = ?
         LIMIT 1`,
        [employeeId]
      )

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found.',
        })
      }

      const employee = users[0]

      if (employee.role !== 'EMPLOYEE') {
        return res.status(403).json({
          success: false,
          message: 'Only employee accounts can be deleted here.',
        })
      }

      await createAuditLog(
        req.user.id,
        'EMPLOYEE_DELETED',
        `Deleted employee ID ${employee.id}: ${employee.name} (${employee.email})`,
        req
      )

      await pool.execute(
        `DELETE FROM users
         WHERE id = ?
         AND role = 'EMPLOYEE'`,
        [employeeId]
      )

      return res.status(200).json({
        success: true,
        message: 'Employee deleted successfully.',
      })
    } catch (error) {
      console.error(
        'Employee deletion error:',
        error.message
      )

      return res.status(500).json({
        success: false,
        message: 'Unable to delete employee.',
      })
    }
  }
)
// ========================================
// EMPLOYEES - STATUS + PERMISSIONS
// OWNER ONLY
// ========================================

// ----------------------------------------
// ENABLE / DISABLE EMPLOYEE
// ----------------------------------------

app.patch(
  '/api/admin/employees/:id/status',
  requireAuth,
  requireOwner,
  async (req, res) => {
    try {
      const employeeId = Number(req.params.id)
      const { is_active } = req.body

      if (!Number.isInteger(employeeId) || employeeId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid employee ID.',
        })
      }

      if (typeof is_active !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'is_active must be true or false.',
        })
      }

      const [users] = await pool.execute(
        `SELECT id, name, email, role, is_active
         FROM users
         WHERE id = ?
         LIMIT 1`,
        [employeeId]
      )

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found.',
        })
      }

      const employee = users[0]

      if (employee.role !== 'EMPLOYEE') {
        return res.status(403).json({
          success: false,
          message: 'Only employee accounts can be modified here.',
        })
      }

      await pool.execute(
        `UPDATE users
         SET is_active = ?
         WHERE id = ?
         AND role = 'EMPLOYEE'`,
        [is_active ? 1 : 0, employeeId]
      )

      await createAuditLog(
        req.user.id,
        is_active
          ? 'EMPLOYEE_ENABLED'
          : 'EMPLOYEE_DISABLED',
        `${is_active ? 'Enabled' : 'Disabled'} employee ID ${employee.id}: ${employee.name} (${employee.email})`,
        req
      )

      return res.status(200).json({
        success: true,
        message: is_active
          ? 'Employee enabled successfully.'
          : 'Employee disabled successfully.',
      })
    } catch (error) {
      console.error(
        'Employee status update error:',
        error.message
      )

      return res.status(500).json({
        success: false,
        message: 'Unable to update employee status.',
      })
    }
  }
)


// ----------------------------------------
// GET ALL AVAILABLE PERMISSIONS
// ----------------------------------------

app.get(
  '/api/admin/permissions',
  requireAuth,
  requireOwner,
  async (req, res) => {
    try {
      const [permissions] = await pool.execute(
        `SELECT
            id,
            permission_key,
            description
         FROM permissions
         ORDER BY permission_key ASC`
      )

      return res.status(200).json({
        success: true,
        permissions,
      })
    } catch (error) {
      console.error(
        'Permissions list error:',
        error.message
      )

      return res.status(500).json({
        success: false,
        message: 'Unable to load permissions.',
      })
    }
  }
)


// ----------------------------------------
// GET ONE EMPLOYEE'S PERMISSIONS
// ----------------------------------------

app.get(
  '/api/admin/employees/:id/permissions',
  requireAuth,
  requireOwner,
  async (req, res) => {
    try {
      const employeeId = Number(req.params.id)

      if (!Number.isInteger(employeeId) || employeeId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid employee ID.',
        })
      }

      const [users] = await pool.execute(
        `SELECT
            id,
            name,
            email,
            role,
            is_active
         FROM users
         WHERE id = ?
         LIMIT 1`,
        [employeeId]
      )

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found.',
        })
      }

      const employee = users[0]

      if (employee.role !== 'EMPLOYEE') {
        return res.status(403).json({
          success: false,
          message: 'This account is not an employee.',
        })
      }

      const [permissions] = await pool.execute(
        `SELECT
            p.id,
            p.permission_key,
            p.description,
            CASE
              WHEN up.user_id IS NULL THEN 0
              ELSE 1
            END AS granted
         FROM permissions p
         LEFT JOIN user_permissions up
           ON up.permission_id = p.id
          AND up.user_id = ?
         ORDER BY p.permission_key ASC`,
        [employeeId]
      )

      return res.status(200).json({
        success: true,
        employee,
        permissions,
      })
    } catch (error) {
      console.error(
        'Employee permissions error:',
        error.message
      )

      return res.status(500).json({
        success: false,
        message: 'Unable to load employee permissions.',
      })
    }
  }
)


// ----------------------------------------
// SAVE EMPLOYEE PERMISSIONS
// ----------------------------------------

app.put(
  '/api/admin/employees/:id/permissions',
  requireAuth,
  requireOwner,
  async (req, res) => {
    let connection

    try {
      const employeeId = Number(req.params.id)
      const { permissions } = req.body

      if (!Number.isInteger(employeeId) || employeeId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid employee ID.',
        })
      }

      if (!Array.isArray(permissions)) {
        return res.status(400).json({
          success: false,
          message: 'Permissions must be an array.',
        })
      }

      const uniquePermissions = [
        ...new Set(
          permissions.filter(
            (permission) =>
              typeof permission === 'string'
          )
        ),
      ]

      connection = await pool.getConnection()

      await connection.beginTransaction()

      const [users] = await connection.execute(
        `SELECT
            id,
            name,
            email,
            role
         FROM users
         WHERE id = ?
         LIMIT 1`,
        [employeeId]
      )

      if (users.length === 0) {
        await connection.rollback()

        return res.status(404).json({
          success: false,
          message: 'Employee not found.',
        })
      }

      const employee = users[0]

      if (employee.role !== 'EMPLOYEE') {
        await connection.rollback()

        return res.status(403).json({
          success: false,
          message: 'This account is not an employee.',
        })
      }

      let validPermissions = []

      if (uniquePermissions.length > 0) {
        const placeholders = uniquePermissions
          .map(() => '?')
          .join(',')

        const [permissionRows] =
          await connection.execute(
            `SELECT
                id,
                permission_key
             FROM permissions
             WHERE permission_key IN (${placeholders})`,
            uniquePermissions
          )

        validPermissions = permissionRows

        if (
          validPermissions.length !==
          uniquePermissions.length
        ) {
          await connection.rollback()

          return res.status(400).json({
            success: false,
            message:
              'One or more permissions are invalid.',
          })
        }
      }

      await connection.execute(
        `DELETE FROM user_permissions
         WHERE user_id = ?`,
        [employeeId]
      )

      for (const permission of validPermissions) {
        await connection.execute(
          `INSERT INTO user_permissions
             (user_id, permission_id)
           VALUES (?, ?)`,
          [employeeId, permission.id]
        )
      }

      await connection.commit()

      await createAuditLog(
        req.user.id,
        'EMPLOYEE_PERMISSIONS_UPDATED',
        `Updated permissions for employee ID ${employee.id}: ${employee.name} (${employee.email}). Permissions: ${
          uniquePermissions.length > 0
            ? uniquePermissions.join(', ')
            : 'NONE'
        }`,
        req
      )

      return res.status(200).json({
        success: true,
        message: 'Employee permissions updated successfully.',
        permissions: uniquePermissions,
      })
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback()
        } catch {
          // Ignore rollback error
        }
      }

      console.error(
        'Employee permission update error:',
        error.message
      )

      return res.status(500).json({
        success: false,
        message: 'Unable to update employee permissions.',
      })
    } finally {
      if (connection) {
        connection.release()
      }
    }
  }
)
// ========================================
// ASSISTANTS
// OWNER ONLY
// ========================================

// ----------------------------------------
// LIST ASSISTANTS
// ----------------------------------------

app.get(
  '/api/admin/assistants',
  requireAuth,
  requireOwner,
  async (req, res) => {
    try {
      const [assistants] = await pool.execute(
        `SELECT
            id,
            name,
            email,
            role,
            is_active,
            created_at,
            last_login_at
         FROM users
         WHERE role = 'ASSISTANT'
         ORDER BY created_at DESC`
      )

      return res.status(200).json({
        success: true,
        assistants,
      })
    } catch (error) {
      console.error(
        'Assistants list error:',
        error.message
      )

      return res.status(500).json({
        success: false,
        message: 'Unable to load assistants.',
      })
    }
  }
)


// ----------------------------------------
// CREATE ASSISTANT
// ----------------------------------------

app.post(
  '/api/admin/assistants',
  requireAuth,
  requireOwner,
  async (req, res) => {
    try {
      const name =
        typeof req.body.name === 'string'
          ? req.body.name.trim()
          : ''

      const email =
        typeof req.body.email === 'string'
          ? req.body.email.trim().toLowerCase()
          : ''

      const password =
        typeof req.body.password === 'string'
          ? req.body.password
          : ''

      if (name.length < 2 || name.length > 100) {
        return res.status(400).json({
          success: false,
          message:
            'Name must contain between 2 and 100 characters.',
        })
      }

      if (
        !email ||
        email.length > 190 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ) {
        return res.status(400).json({
          success: false,
          message: 'Enter a valid email address.',
        })
      }

      if (
        password.length < 12 ||
        password.length > 128
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Password must contain between 12 and 128 characters.',
        })
      }

      const [existingUsers] = await pool.execute(
        `SELECT id
         FROM users
         WHERE email = ?
         LIMIT 1`,
        [email]
      )

      if (existingUsers.length > 0) {
        return res.status(409).json({
          success: false,
          message:
            'An account with this email already exists.',
        })
      }

      const passwordHash = await argon2.hash(
        password,
        {
          type: argon2.argon2id,
        }
      )

      const [result] = await pool.execute(
        `INSERT INTO users
           (
             name,
             email,
             password_hash,
             role,
             is_active
           )
         VALUES (?, ?, ?, 'ASSISTANT', 1)`,
        [
          name,
          email,
          passwordHash,
        ]
      )

      await createAuditLog(
        req.user.id,
        'ASSISTANT_CREATED',
        `Created assistant ID ${result.insertId}: ${name} (${email})`,
        req
      )

      return res.status(201).json({
        success: true,
        message:
          'Assistant created successfully.',
        assistant: {
          id: result.insertId,
          name,
          email,
          role: 'ASSISTANT',
          is_active: true,
        },
      })
    } catch (error) {
      console.error(
        'Assistant creation error:',
        error.message
      )

      return res.status(500).json({
        success: false,
        message:
          'Unable to create assistant.',
      })
    }
  }
)


// ----------------------------------------
// ENABLE / DISABLE ASSISTANT
// ----------------------------------------

app.patch(
  '/api/admin/assistants/:id/status',
  requireAuth,
  requireOwner,
  async (req, res) => {
    try {
      const assistantId = Number(req.params.id)
      const { is_active } = req.body

      if (
        !Number.isInteger(assistantId) ||
        assistantId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid assistant ID.',
        })
      }

      if (typeof is_active !== 'boolean') {
        return res.status(400).json({
          success: false,
          message:
            'is_active must be true or false.',
        })
      }

      const [users] = await pool.execute(
        `SELECT
            id,
            name,
            email,
            role
         FROM users
         WHERE id = ?
         LIMIT 1`,
        [assistantId]
      )

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Assistant not found.',
        })
      }

      const assistant = users[0]

      if (assistant.role !== 'ASSISTANT') {
        return res.status(403).json({
          success: false,
          message:
            'Only assistant accounts can be modified here.',
        })
      }

      await pool.execute(
        `UPDATE users
         SET is_active = ?
         WHERE id = ?
         AND role = 'ASSISTANT'`,
        [
          is_active ? 1 : 0,
          assistantId,
        ]
      )

      await createAuditLog(
        req.user.id,
        is_active
          ? 'ASSISTANT_ENABLED'
          : 'ASSISTANT_DISABLED',
        `${is_active ? 'Enabled' : 'Disabled'} assistant ID ${assistant.id}: ${assistant.name} (${assistant.email})`,
        req
      )

      return res.status(200).json({
        success: true,
        message: is_active
          ? 'Assistant enabled successfully.'
          : 'Assistant disabled successfully.',
      })
    } catch (error) {
      console.error(
        'Assistant status error:',
        error.message
      )

      return res.status(500).json({
        success: false,
        message:
          'Unable to update assistant status.',
      })
    }
  }
)


// ----------------------------------------
// GET ASSISTANT PERMISSIONS
// ----------------------------------------

app.get(
  '/api/admin/assistants/:id/permissions',
  requireAuth,
  requireOwner,
  async (req, res) => {
    try {
      const assistantId = Number(req.params.id)

      if (
        !Number.isInteger(assistantId) ||
        assistantId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid assistant ID.',
        })
      }

      const [users] = await pool.execute(
        `SELECT
            id,
            name,
            email,
            role,
            is_active
         FROM users
         WHERE id = ?
         LIMIT 1`,
        [assistantId]
      )

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Assistant not found.',
        })
      }

      const assistant = users[0]

      if (assistant.role !== 'ASSISTANT') {
        return res.status(403).json({
          success: false,
          message:
            'This account is not an assistant.',
        })
      }

      const [permissions] = await pool.execute(
        `SELECT
            p.id,
            p.permission_key,
            p.description,
            CASE
              WHEN up.user_id IS NULL THEN 0
              ELSE 1
            END AS granted
         FROM permissions p
         LEFT JOIN user_permissions up
           ON up.permission_id = p.id
          AND up.user_id = ?
         ORDER BY p.permission_key ASC`,
        [assistantId]
      )

      return res.status(200).json({
        success: true,
        assistant,
        permissions,
      })
    } catch (error) {
      console.error(
        'Assistant permissions error:',
        error.message
      )

      return res.status(500).json({
        success: false,
        message:
          'Unable to load assistant permissions.',
      })
    }
  }
)


// ----------------------------------------
// SAVE ASSISTANT PERMISSIONS
// ----------------------------------------

app.put(
  '/api/admin/assistants/:id/permissions',
  requireAuth,
  requireOwner,
  async (req, res) => {
    let connection

    try {
      const assistantId = Number(req.params.id)
      const { permissions } = req.body

      if (
        !Number.isInteger(assistantId) ||
        assistantId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid assistant ID.',
        })
      }

      if (!Array.isArray(permissions)) {
        return res.status(400).json({
          success: false,
          message:
            'Permissions must be an array.',
        })
      }

      const uniquePermissions = [
        ...new Set(
          permissions.filter(
            (permission) =>
              typeof permission === 'string'
          )
        ),
      ]

      connection = await pool.getConnection()

      await connection.beginTransaction()

      const [users] =
        await connection.execute(
          `SELECT
              id,
              name,
              email,
              role
           FROM users
           WHERE id = ?
           LIMIT 1`,
          [assistantId]
        )

      if (users.length === 0) {
        await connection.rollback()

        return res.status(404).json({
          success: false,
          message: 'Assistant not found.',
        })
      }

      const assistant = users[0]

      if (assistant.role !== 'ASSISTANT') {
        await connection.rollback()

        return res.status(403).json({
          success: false,
          message:
            'This account is not an assistant.',
        })
      }

      let validPermissions = []

      if (uniquePermissions.length > 0) {
        const placeholders =
          uniquePermissions
            .map(() => '?')
            .join(',')

        const [permissionRows] =
          await connection.execute(
            `SELECT
                id,
                permission_key
             FROM permissions
             WHERE permission_key IN (${placeholders})`,
            uniquePermissions
          )

        validPermissions = permissionRows

        if (
          validPermissions.length !==
          uniquePermissions.length
        ) {
          await connection.rollback()

          return res.status(400).json({
            success: false,
            message:
              'One or more permissions are invalid.',
          })
        }
      }

      await connection.execute(
        `DELETE FROM user_permissions
         WHERE user_id = ?`,
        [assistantId]
      )

      for (
        const permission of validPermissions
      ) {
        await connection.execute(
          `INSERT INTO user_permissions
             (user_id, permission_id)
           VALUES (?, ?)`,
          [
            assistantId,
            permission.id,
          ]
        )
      }

      await connection.commit()

      await createAuditLog(
        req.user.id,
        'ASSISTANT_PERMISSIONS_UPDATED',
        `Updated permissions for assistant ID ${assistant.id}: ${assistant.name} (${assistant.email}). Permissions: ${
          uniquePermissions.length > 0
            ? uniquePermissions.join(', ')
            : 'NONE'
        }`,
        req
      )

      return res.status(200).json({
        success: true,
        message:
          'Assistant permissions updated successfully.',
        permissions: uniquePermissions,
      })
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback()
        } catch {
          // Ignore rollback error
        }
      }

      console.error(
        'Assistant permission update error:',
        error.message
      )

      return res.status(500).json({
        success: false,
        message:
          'Unable to update assistant permissions.',
      })
    } finally {
      if (connection) {
        connection.release()
      }
    }
  }
)


// ----------------------------------------
// DELETE ASSISTANT
// ----------------------------------------

app.delete(
  '/api/admin/assistants/:id',
  requireAuth,
  requireOwner,
  async (req, res) => {
    try {
      const assistantId = Number(req.params.id)

      if (
        !Number.isInteger(assistantId) ||
        assistantId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid assistant ID.',
        })
      }

      const [users] = await pool.execute(
        `SELECT
            id,
            name,
            email,
            role
         FROM users
         WHERE id = ?
         LIMIT 1`,
        [assistantId]
      )

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Assistant not found.',
        })
      }

      const assistant = users[0]

      if (assistant.role !== 'ASSISTANT') {
        return res.status(403).json({
          success: false,
          message:
            'Only assistant accounts can be deleted here.',
        })
      }

      await createAuditLog(
        req.user.id,
        'ASSISTANT_DELETED',
        `Deleted assistant ID ${assistant.id}: ${assistant.name} (${assistant.email})`,
        req
      )

      await pool.execute(
        `DELETE FROM users
         WHERE id = ?
         AND role = 'ASSISTANT'`,
        [assistantId]
      )

      return res.status(200).json({
        success: true,
        message:
          'Assistant deleted successfully.',
      })
    } catch (error) {
      console.error(
        'Assistant deletion error:',
        error.message
      )

      return res.status(500).json({
        success: false,
        message:
          'Unable to delete assistant.',
      })
    }
  }
)
// ========================================
// OWNER-ONLY TEST ROUTE
// ========================================

app.get(
  '/api/owner/status',
  requireAuth,
  requireOwner,
  (req, res) => {
    res.status(200).json({
      success: true,
      access: 'OWNER',
      message:
        'Owner authorization confirmed.',
    })
  }
)

// ========================================
// 404
// ========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found.',
  })
})

// ========================================
// ERROR HANDLER
// ========================================

app.use((err, req, res, next) => {
  console.error(
    'MC2 Labs server error:',
    err
  )

  res.status(500).json({
    success: false,
    message: 'Internal server error.',
  })
})

// ========================================
// START SERVER
// ========================================

async function startServer() {
  try {
    const database =
      await testDatabaseConnection()

    console.log('')
    console.log(
      '======================================'
    )
    console.log(
      '        MC2 LABS BACKEND'
    )
    console.log(
      '======================================'
    )
    console.log(
      `Database: ${database.database_name}`
    )
    console.log(
      `Server: http://localhost:${PORT}`
    )
    console.log(
      `Health: http://localhost:${PORT}/api/health`
    )
    console.log(
      'Database authentication: ENABLED'
    )
    console.log(
      'Role authorization: ENABLED'
    )
    console.log(
      'Audit logging: ENABLED'
    )
    console.log(
      'Status: ONLINE'
    )
    console.log(
      '======================================'
    )
    console.log('')

    app.listen(PORT)
  } catch (error) {
    console.error('')
    console.error(
      'MC2 Labs backend failed to start.'
    )
    console.error(
      `Database error: ${error.message}`
    )
    console.error('')

    process.exit(1)
  }
}

startServer()