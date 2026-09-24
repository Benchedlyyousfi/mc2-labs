import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './App.css'

function AdminDashboard() {
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function verifySession() {
      try {
        const response = await fetch(
          'http://localhost:5000/api/auth/me',
          {
            method: 'GET',
            credentials: 'include',
          }
        )

        if (!response.ok) {
          navigate('/admin', { replace: true })
          return
        }

        const data = await response.json()

        if (!data.user || data.user.role !== 'OWNER') {
          navigate('/admin', { replace: true })
          return
        }

        setUser(data.user)
      } catch {
        navigate('/admin', { replace: true })
      } finally {
        setLoading(false)
      }
    }

    verifySession()
  }, [navigate])

  async function handleLogout() {
    try {
      await fetch(
        'http://localhost:5000/api/auth/logout',
        {
          method: 'POST',
          credentials: 'include',
        }
      )
    } finally {
      navigate('/admin', { replace: true })
    }
  }

  if (loading) {
    return (
      <div className="adminPage">
        <div className="adminLoading">
          Verifying secure session...
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="adminPage">

      <div className="dashboardShell">

        <aside className="dashboardSidebar">

          <div className="dashboardBrand">
            <div className="dashboardLogo">
              MC2
            </div>

            <div>
              <strong>MC2 Labs</strong>
              <span>Administration</span>
            </div>
          </div>

          <nav className="dashboardMenu">
            <Link
                to="/admin/dashboard"
                className="active"
            >
                Overview
            </Link>

            <Link to="/admin/products">
                Products
            </Link>

            <Link to="/admin/employees">
                Employees
            </Link>

            <Link to="/admin/assistants">
                Assistants
            </Link>

            <Link to="/admin/security">
                Security
            </Link>

            <Link to="/admin/settings">
                Settings
            </Link>
        </nav>

          <button
            className="dashboardLogout"
            onClick={handleLogout}
          >
            Sign out
          </button>

        </aside>

        <main className="dashboardMain">

          <header className="dashboardHeader">
            <div>
              <span className="dashboardLabel">
                OWNER DASHBOARD
              </span>

              <h1>Welcome to MC2 Labs</h1>

              <p>
                Manage your products, team and MC2 Labs platform.
              </p>
            </div>

            <div className="ownerBadge">
              <div className="ownerAvatar">
                MC2
              </div>

              <div>
                <strong>{user.name}</strong>
                <span>Owner</span>
              </div>
            </div>
          </header>

          <section className="dashboardStats">

            <article>
              <span>PRODUCTS</span>
              <strong>1</strong>
              <p>Published product</p>
            </article>

            <article>
              <span>EMPLOYEES</span>
              <strong>0</strong>
              <p>Team members</p>
            </article>

            <article>
              <span>ASSISTANTS</span>
              <strong>0</strong>
              <p>Active assistants</p>
            </article>

            <article>
              <span>SECURITY</span>
              <strong>Active</strong>
              <p>Protected session</p>
            </article>

          </section>

          <section className="dashboardPanel">

            <div className="dashboardPanelHeader">
              <div>
                <span>MC2 LABS</span>
                <h2>Administration overview</h2>
              </div>

              <div className="secureStatus">
                ● Secure session
              </div>
            </div>

            <div className="dashboardProduct">

              <div className="dashboardProductIcon">
                MC2
              </div>

              <div>
                <span>WINDOWS APPLICATION</span>
                <h3>MC2 Instagram Cleaner</h3>
                <p>
                  Version 1.1.0
                </p>
              </div>

              <div className="dashboardPublished">
                Published
              </div>

            </div>

          </section>

        </main>

      </div>

    </div>
  )
}

export default AdminDashboard