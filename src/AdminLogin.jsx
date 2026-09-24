import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './App.css'

function AdminLogin() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    async function checkSession() {
      try {
        const response = await fetch(
          'http://localhost:5000/api/auth/me',
          {
            method: 'GET',
            credentials: 'include',
          }
        )

        if (response.ok) {
          navigate('/admin/dashboard', {
            replace: true,
          })
          return
        }
      } catch {
        // Backend unavailable or no active session.
      }

      setCheckingSession(false)
    }

    checkSession()
  }, [navigate])

  async function handleSubmit(event) {
    event.preventDefault()

    setMessage('')
    setLoading(true)

    try {
      const response = await fetch(
        'http://localhost:5000/api/auth/login',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          credentials: 'include',

          body: JSON.stringify({
            email,
            password,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setMessage(
          data.message || 'Unable to sign in.'
        )
        return
      }

      navigate('/admin/dashboard', {
        replace: true,
      })
    } catch {
      setMessage(
        'Unable to connect to the MC2 Labs server.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="adminPage">
        <div className="adminLoading">
          Checking secure session...
        </div>
      </div>
    )
  }

  return (
    <div className="adminPage">

      <nav className="adminNav">
        <Link to="/" className="logo productLogo">
          <span>MC2</span> Labs
        </Link>

        <Link to="/" className="backButton">
          ← Back to website
        </Link>
      </nav>

      <main className="loginContainer">

        <div className="loginCard">

          <div className="loginIcon">
            MC2
          </div>

          <div className="loginBadge">
            SECURE ADMIN ACCESS
          </div>

          <h1>Welcome back</h1>

          <p className="loginSubtitle">
            Sign in to access the MC2 Labs management
            dashboard.
          </p>

          <form
            className="loginForm"
            onSubmit={handleSubmit}
          >

            <label htmlFor="adminEmail">
              Email
            </label>

            <input
              id="adminEmail"
              type="email"
              autoComplete="username"
              placeholder="Owner email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
            />

            <label htmlFor="adminPassword">
              Password
            </label>

            <input
              id="adminPassword"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
            />

            {message && (
              <div className="loginError">
                {message}
              </div>
            )}

            <button
              className="loginButton"
              type="submit"
              disabled={loading}
            >
              {loading
                ? 'Signing in...'
                : 'Sign in securely'}
            </button>

          </form>

          <div className="loginSecurity">
            <span>●</span>
            Protected MC2 Labs administration
          </div>

        </div>

      </main>

    </div>
  )
}

export default AdminLogin